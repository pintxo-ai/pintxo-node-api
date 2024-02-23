import axios from 'axios';
import { CohereClient } from "cohere-ai";
import { InputValue, CLASSIFIER_LEVELS } from "./types";
import { parse, stringify } from 'yaml'
import { GeneralError } from '@feathersjs/errors';

const cohere = new CohereClient({
    token: process.env.COHERE_API_KEY || "invalid, set COHERE_API_KEY in .env",
});

/// Handles all logic associated with calling a LM api. 
class LMHandler {
    async extract_function_parameters(user_input: string, relevant_functions: any) {
        let cohere_response = await cohere.generate({
            prompt: get_formatted_prompt(user_input, relevant_functions),
            temperature: 0,
        });
        try {
            return decompose_string(cohere_response.generations[0].text);
        } catch (error) {
            try {
                let yaml_retry = await cohere.generate({
                    prompt: get_retry_prompt(cohere_response.generations[0].text),
                    temperature: 0,
                });
                return decompose_string(yaml_retry.generations[0].text);
            } catch (e){
                throw new GeneralError("Both initial YAML generation and subsequent retry failed to format proper YAML.")
            }
        }
    }

    async classify(user_input: string, level: CLASSIFIER_LEVELS){
        if (level == CLASSIFIER_LEVELS.LEVEL_ONE) {
            return (await cohere.classify({
                model: process.env.LEVEL_ONE_CLASSIFIER, // classifier v0.1
                inputs: [user_input],
                examples: []
            })).classifications[0].prediction
        }
        if (level == CLASSIFIER_LEVELS.LEVEL_TWO) {
            // coming soon?
        }
        if (level == CLASSIFIER_LEVELS.DATA_LEVEL_ONE) {
            // return (await cohere.classify({
            //     model: process.env.DATA_LEVEL_ONE_CLASSIFIER, // query_level_one_classifier_v0.1
            //     inputs: [user_input],
            //     examples: []
            // })).classifications[0].prediction
            // TO FINISH, WILL FINISH TRAINING SCRIPT & TUNE MODEL TMR
            return ""
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
                } else {
                    throw new GeneralError("yaml parsing failed.");
                }
            } catch (e) {
                throw new GeneralError("yaml parsing failed.", e)
            }
        }
        throw new GeneralError("no yaml was successfully generated."); 
    }
}

function get_retry_prompt(input: string): string {
    return `
    Below is data that is supposed to be yaml formatted. 
    Sometimes this string will have an extra sentence at the end. ignore that.


    Format the following broken-yaml into yaml:
    ${input}

    YAML:
    `
}


export default LMHandler
