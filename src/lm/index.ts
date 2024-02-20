import { CohereClient } from "cohere-ai";


const cohere = new CohereClient({
    token: process.env.COHERE_API_KEY || "invalid, set COHERE_API_KEY in .env",
});

class LMHandler {
    async extract_function_parameters(user_input: string, relevant_functions: any) {
        // console.log(relevant_functions)
        let cohere_response = await cohere.generate({
            prompt: get_formatted_prompt(user_input, relevant_functions),
            temperature: 0,
        });
        
        // let function_parameters = decompose_string(cohere_response.generations[0].text);
        return decompose_string(cohere_response.generations[0].text);
    }
}

function get_formatted_prompt(text: string, signature: string) {
    return `You are in charge of identifying input parameters for a function signature based on a user given input. 
    You must return the data you extract in the form:

    [PARAMETER_ONE]:[PARAMETER_ONE_VALUE]
    [PARAMETER_TWO]:[PARAMETER_TWO_VALUE]

    Here's an example to follow:
    <example>
    Given a user input of "deposit all of my ETH to earn more" and function signatures:

    signature:"withdraw(address asset, uint256 amount)"
    description:"withdraw an ERC20 token already supplied to Aave to earn yield."

    signature:"deposit(address asset, uint256 amount)"
    description:"supply an ERC20 token to Aave to earn yield."

    signature:"approve(address guy, uint256 wad)"
    description:"Approval function for erc20 or erc721 contracts."

    your output should be:
    function:deposit##asset:ETH##amount:ALL
    </example>
    
    Now you give it a go:

    Here are the relevant function signatures for the user's input:

    ${signature}

    and here is the user input you are to process:

    ${text}

    Remember, your response should be strictly the output with no justification. 
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