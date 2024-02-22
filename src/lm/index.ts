import { CohereClient } from "cohere-ai";
import { InputValue, CLASSIFIER_LEVELS } from "./types";

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
        return decompose_string(cohere_response.generations[0].text);
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
    }
}


function get_formatted_prompt(text: string, signature: string) {
    const prompt =  `You are in charge of identifying input parameters for a function signature based on a user given input. 
    You must return the data you extract in the form:

    [PARAMETER_ONE]:[PARAMETER_ONE_VALUE]:[PARAMETER_ONE_TYPE]
    [PARAMETER_TWO]:[PARAMETER_TWO_VALUE]:[PARAMETER_TWO_TYPE]

    Here's an example to follow:
    <example>
    Given a user input of "deposit all of my ETH to earn more" and function signatures:
    
    signature:"aave_withdraw(address asset, uint256 amount)"
    description:"withdraw an ERC20 token already supplied to Aave to earn yield."

    signature:"aave_deposit(address asset, uint256 amount)"
    description:"supply an ERC20 token to Aave to earn yield."

    signature:"approve(address guy, uint256 wad)"
    description:"Approval function for erc20 or erc721 contracts."

    your output should be:
    function:aave_deposit:none##asset:ETH:address##amount:ALL:uint256
    </example>
    
    Now you give it a go:

    Here are the relevant function signatures for the user's input:

    ${signature}

    and here is the user input you are to process:

    ${decodeURIComponent(text)}

    Remember, your response should be strictly the output with no justification. 
    Output:
    `
    return prompt
} 

function decompose_string(input: string): Record<string, InputValue> {
    const pairs = input.split('##'); 
    const result: Record<string, InputValue> = {};
    pairs.forEach(pair => {
        const [key, value, value_type] = pair.split(':');
        result[key] = {value, value_type}; 
      });
    return result;
}


export default LMHandler
