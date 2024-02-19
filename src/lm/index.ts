import { CohereClient } from "cohere-ai";


const cohere = new CohereClient({
    token: process.env.COHERE_API_KEY || "invalid, set COHERE_API_KEY in .env",
});

class LMHandler {
    async extract_function_parameters(user_input: string, relevant_functions: any) {
        console.log(relevant_functions)
        let cohere_response = await cohere.generate({
            prompt: get_formatted_prompt(user_input),
            temperature: 0,
        })
        return decompose_string(cohere_response.generations[0].text);
    }
}

function get_formatted_prompt(text: string) {
    return `You are in charge of identifying input parameters for a given function signature based on a user given input. 
    You must return the data you extract in the form:

    [PARAMETER_ONE]:[PARAMETER_ONE_VALUE]
    [PARAMETER_TWO]:[PARAMETER_TWO_VALUE]

    For example, given the function signatures: 
    
    input_signature:"transformERC20(address inputToken, address outputToken, uint256 inputTokenAmount)"
    description: description: "perform a swap between two cryptocurrencies using the 0x aggregator. This function is especially useful for buying and selling cryptocurrencies. If someone wants to sell or buy, they should use this function."
    
    input_signature:"deposit(address asset, uint256 amount)"
    description:"supply an ERC20 token to Aave to earn yield."

    input_signature:"withdraw(address asset, uint256 amount)"
    description:"withdraw an ERC20 token already supplied to Aave to earn yield."

    and a user input of "I want to sell all of my bitcoin for eth",

    your output should be:
    
    function:swap##inputToken:bitcoin##outputToken:eth##inputTokenAmount:undefined

    or if the user input is "I want to sell 525 BAL for ethereum"

    your output should be:
    function:swap##inputToken:BAL##outputToken:ethereum##inputTokenAmount:525

    Here is the user input you are to process:

    ${text}

    Output:
    `
} 

function decompose_string(input: string): Record<string, string> {
    const pairs = input.split('##'); 
    const result: Record<string, string> = {};
    pairs.forEach(pair => {
        const [key, value] = pair.split(':');
        result[key] = value; 
      });
    return result;
}


export default LMHandler