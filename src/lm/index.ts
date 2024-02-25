import axios from 'axios';
import { CohereClient } from "cohere-ai";
import { CLASSIFIER_LEVELS } from "./types";
import { parse } from 'yaml';
import { LanguageModelError } from '../errors';
import { LM_ERROR_CLASSES } from '../errors/types';

const cohere = new CohereClient({
    token: process.env.COHERE_API_KEY || "invalid, set COHERE_API_KEY in .env",
});

/// Handles all logic associated with calling a LM api. 
class LMHandler {
    async extract_function_parameters(user_input: string, relevant_functions: any) {
        let first_attempt: string = '';
        let second_attempt: string = '';

        try {
            // first shot
            let cohere_response = await cohere.generate({
                prompt: get_formatted_prompt(user_input, relevant_functions),
                temperature: 0,
            });
            first_attempt = cohere_response.generations[0].text;
            return decompose_string(cohere_response.generations[0].text);
        } catch (e) {
            try {
                let yaml_retry = await cohere.generate({
                    prompt: get_retry_prompt(first_attempt),
                    temperature: 0,
                });
                second_attempt = yaml_retry.generations[0].text;
                let second_parsed = decompose_string(yaml_retry.generations[0].text);
                if (second_parsed == null || second_parsed.function == null) {
                    throw new LanguageModelError("parsing failed to extract a function signature or args.", LM_ERROR_CLASSES.BAD_YAML, {"function" : "extract_function_parameters", "message": '', "user_input": user_input, "first_generation": first_attempt, "second_generation": second_attempt})
                }
                return second_parsed
            } catch (e){
                throw new LanguageModelError("second parsing failed to extract a function signature or args.", LM_ERROR_CLASSES.BAD_YAML, {"function" : "extract_function_parameters", "message": '', "user_input": user_input, "first_generation": first_attempt, "second_generation": second_attempt})
            }
        }
        
    }

    async classify(user_input: string, level: CLASSIFIER_LEVELS){
        if (level == CLASSIFIER_LEVELS.LEVEL_ONE) {
            let classification = await cohere.classify({
                model: process.env.LEVEL_ONE_CLASSIFIER, // classifier v0.1
                inputs: [user_input],
                examples: []
            })
            try {
                return classification.classifications[0].prediction
            } catch (error) {
                throw new LanguageModelError("failed to classify.", LM_ERROR_CLASSES.BAD_CLASSIFY, {"function" : "classify", "message": error as string, "user_input": user_input, "first_generation": classification.classifications[0].prediction || "none"})
            }
        }

        // this should be inside the above IF statement. ie, DATA_LEVEL_ONE is accessed after the LEVEL_ONE being 'data'
        if (level == CLASSIFIER_LEVELS.DATA_LEVEL_ONE) {
        }
    }

    async perplexity(query: string) {
        const data = {
            model: 'mistral-7b-instruct',
            messages: [
                { 
                    content: "You are Pintxo On-Chain Chad, a specialized artificial intelligence assistant with " +
                        "a focus on blockchain technology, cryptocurrencies, and the broader " +
                        "ecosystem around it. Your role is to engage in helpful, detailed, " +
                        "and polite conversations with users, providing them with accurate, " +
                        "up-to-date information on blockchain and crypto-related queries. " +
                        "You should be capable of performing searches to gather the latest " +
                        "information, explaining complex concepts in an accessible manner, " +
                        "and assisting users with inquiries related to blockchain technology, " +
                        "crypto markets, smart contracts, NFTs, and other related topics. " +
                        "Your responses should reflect a deep understanding of the subject matter, " +
                        "tailored to the user's level of expertise. If you cannot find an answer, inform the user and do not lie.", 
                    role: 'system' 
                },
                { 
                    content: query, 
                    role: 'user' 
                },
            ],
            max_tokens: 512,
            temperature: 1,
            top_p: 1,
            top_k: 0,
            stream: false,
            presence_penalty: 0,
            frequency_penalty: 1
        };
        
    
        const config = {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}` // ADD TO ENV
                
            }
        };
    
        try {
            const response = await axios.post('https://api.perplexity.ai/chat/completions', data, config); // TODO: MAKE API URL ENV VAR - ${process.env.PERPLEXITY_API_URL}
            return response.data;
        } catch (error) {
            return { 'RESPONSE': 'NOT FOUND' };
        }
    }
}


function get_formatted_prompt(text: string, signature: string) {
    const prompt =  `You are in charge of identifying input parameters for a function signature based on a user given input. 
    You must return the data you extract in the form:

    [PARAMETER_ONE]:
        value: [PARAMETER_ONE_VALUE]:
        type: [PARAMETER_ONE_TYPE]
    [PARAMETER_TWO]:
        value: [PARAMETER_TWO_VALUE]
        type: [PARAMETER_TWO_TYPE]

    Here's an example to follow:
    <example>
    Given a user input of "deposit all of my ETH to earn more" and function signatures:
    
    signature:"aave_withdraw(address asset, uint256 amount)"
    description:"withdraw an ERC20 token already supplied to Aave to earn yield."

    signature:"aave_deposit(address asset, uint256 amount)"
    description:"supply an ERC20 token to Aave to earn yield."

    signature:"approve(address guy, uint256 wad)"
    description:"Approval function for erc20 or erc721 contracts."

    Output:
    function:
        aave_deposit
    asset:
        ETH
    amount:
        ALL
    </example>
    
    Now you give it a go:

    Here are the relevant function signatures for the user's input:

    ${signature}

    and here is the user input you are to process:

    ${text}

    Do not return anything except the YAML.
    Output:
    `
    return prompt
} 

// I have been having issues with GeneralError. So if this errors, it may not be graceful.
// once I move to hooks, this will be much better.
function decompose_string(input: string): Record<string, string> {
    try {
        return parse(input)
    } catch (error) {
        for (const maybe_yaml of input.split('```')) {
            try {
                let yaml = parse(maybe_yaml);
                if (yaml != null){
                    return yaml
                }
            } catch (e) {

            }
        }

        // the end of yaml is frequently a double new line. flawed science.
        for (const maybe_yaml of input.split('\n\n')) {
            try {
                let yaml = parse(maybe_yaml);
                if (yaml != null){
                    return yaml
                }
            } catch (e) {
                
            }
        }
        throw new LanguageModelError("yaml parsing failed.", LM_ERROR_CLASSES.BAD_YAML, {"function" : "decompose_string", "message": error as string, "user_input": input, "first_generation": ""})
    }
}

function get_retry_prompt(input: string): string {
    return `
    Format the following broken-yaml into yaml:
    ${input}

    Please don't return anything that isn't part of the YAML. Don't justify or explain anything. Strictly return the YAML.
    YAML:
    `
}


export default LMHandler
