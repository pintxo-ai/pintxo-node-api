// todo
import 'dotenv/config'
import qs from 'qs';

import { ethers } from "ethers";
import { SyndicateClient } from "@syndicateio/syndicate-node";
import VespaHandler from '../vespa'; 
import { VESPA_SCHEMA, NewFunctionSchema } from '../vespa/types';
import LMHandler from '../lm';
import { GeneralError } from '@feathersjs/errors';
import { Interface } from 'ethers';

interface FunctionParameter {
  value: string; // Address or numeric values
  type: 'caller_address' | 'address' | 'uint256' | 'string' | 'bytes'; // Possible types
}
// clients
const syndicate = new SyndicateClient({ token: process.env.SYNDICATE_API_KEY || "no syndicate key"})
let vh = new VespaHandler();
let lm = new LMHandler();

const CHAIN_ID=ethers.getNumber(process.env.BASE_CHAIN_ID || 8453);

/// TransactionHandler class for executing transactions.
class TransactionHandler {
    async process(query: string) {
        let top_3_function_signatures = await vh.query(query, VESPA_SCHEMA.FUNCTION);
        let formatted_function_signatures = top_3_function_signatures.children.map(entry => `signature:"${entry.fields.functional_signature}"\ndescription:"${entry.fields.description}"`).join('\n\n'); 
        
        // this needs work. probably a finetune is essential.
        let parameters = await lm.extract_function_parameters(query, formatted_function_signatures);
        let chosen_function = await vh.get_function_by_id(parameters.function);

        let args = await parse_user_inputted_parameters(chosen_function, parameters);
        let tx = await this.execute(chosen_function, args);
        return tx        
    }

    // todo: add some type checking for params? Definitely needs some proper validation.
    async execute(func: NewFunctionSchema, args: Record<string, string>) {
        // call any prerequisite functions
        if (func.fields.prerequisites) {
            for (const [key, {id, contract_to_call, signature, inputs}] of Object.entries(func.fields.prerequisites)) {
                let args: Record<string, string> = {}
                for (const [key, {name, type, corresponds_to}] of Object.entries(inputs)) {
                    // special case when the main contract address being called is a param. ie, approvals
                    if (corresponds_to == 'contract_address') {
                        args[name] = func.fields.contract_address
                    }
                    else {
                        args[name] = args[corresponds_to]
                    }
                }

                if (!process.env.DEV){
                    let tx = await this.__execute_function(signature, args[contract_to_call], args);
                    // need some way to verify that this tx has settled before continuing
                    console.log(tx)
                } 
            }
        }
        
        // special case for transformERC20, since it needs custom transformations data only available from the 0x api.
        if (!process.env.DEV){
            if (func.fields.name == 'swap') {
                let swap_args = await get_args_for_swap(args.inputToken, args.outputToken, args.inputTokenAmount);
                let tx = await this.__execute_function(func.fields.signature, func.fields.contract_address, swap_args);
                return tx
            } else {
                let tx = await this.__execute_function(func.fields.signature, func.fields.contract_address, args);
                return tx
            }
        } else {
            return {message: "You are on dev mode!", args: args}
        }
    }

    /// this function handles execution, all scaling/retrival should be done before inputting into this.
    async __execute_function(function_signature: string, contract_to_call: string, args: Record<string, string | {deploymentNonce: number, data: string}[] | number>){
        let result;
        try {
            result = await syndicate.transact.sendTransaction({
                projectId: process.env.SYNDICATE_PROJECT_ID || "missing project id",
                contractAddress: contract_to_call,
                chainId: CHAIN_ID,
                functionSignature: function_signature,
                args: args,
            })
        } catch (error) {
            throw new GeneralError("tx errored", error);
        }
        return result
    }
}

function parse_and_validate_params(
    func: NewFunctionSchema,
    functionParams: Record<string, FunctionParameter>,
  ): Record<string, string> { 

    const iface = new Interface(["function "+func.fields.signature]);
    
    let expectedParams = JSON.parse(iface.formatJson())
    
    const parsedObject: Record<string, string> = {
      ...expectedParams[0].inputs.reduce((acc: any, input: any) => ({ ...acc, [input.name]:  '' }), {})
    };
          
    for (const key in functionParams) {
      if (parsedObject.hasOwnProperty(key)) { 
        const param = functionParams[key];
        let value = param.value;
        
        // tiny bit of validation
        if (param.type === 'address') {
          if (!ethers.isAddress(value)) throw new GeneralError("not valid address"); 
        }
        parsedObject[key] = value; 
      }
    }

    for (const [k, {name, type, denominated_by}] of Object.entries(func.fields.inputs)) {
        if (parsedObject.hasOwnProperty(name)) { 
            if (type == 'caller_address') {
                // once we know how syndicate account abstraction works, we would fire in this.
                parsedObject[name] = "0x7bb037dad988406e1e399780e508518599cd4370"
            }
        }
    }
  
    return parsedObject; 
  }

async function get_args_for_swap(sellToken: string, buyToken: string, sellAmount: string) {
    let abi = [
        "function transformERC20(address inputToken, address outputToken, uint256 inputTokenAmount, uint256 minOutputTokenAmount, (uint32 deploymentNonce, bytes data)[] transformations)",
    ];

    const iface  = new ethers.Interface(abi);
        
    const params = {
        sellToken: sellToken, //WETH
        buyToken: buyToken, //USDC
        sellAmount: sellAmount, // Note that the ETH token uses 6 decimal places, so `sellAmount` is `0.001 * 10^18`.
    };    
    const headers = {'0x-api-key': process.env.ZEROEX_API_KEY || "invalid"}; 
    const response = await fetch(
        `https://base.api.0x.org/swap/v1/quote?${qs.stringify(params)}`, { headers }
    ); 
    // The example is for Ethereum mainnet https://api.0x.org. Refer to the 0x Cheat Sheet for all supported endpoints: https://0x.org/docs/introduction/0x-cheat-sheet
    let respo = await response.json();
    let decoded_calldata = iface.decodeFunctionData("transformERC20", respo.data);

    // the last element of the decoded calldata is the transformations[] field.
    let transformations = []    
    for (const index in decoded_calldata[4]) {
        transformations.push({"deploymentNonce" : ethers.getNumber(decoded_calldata[4][index][0]), "data": decoded_calldata[4][index][1].toString()})
    }


    let args: Record<string, string | {deploymentNonce: number, data: string}[] | number> = {}
    
    args["inputToken"] = sellToken;
    args["outputToken"] = buyToken;
    args["inputTokenAmount"] = sellAmount;
    args["minOutputTokenAmount"] = ethers.getNumber(decoded_calldata[3]);
    args["transformations"] = transformations;

    return args
}

async function parse_user_inputted_parameters(func: NewFunctionSchema, result: Record<string, string>): Promise<Record<string, string>> {
    let args: Record<string, string> = {};
    
    for (const [key, input] of Object.entries(func.fields.inputs)) {
        // if our parsed yaml contains the input string
        if (key in result) {
            // if denominated_by is specified, this needs to be scaled. 
            if (input.denominated_by) {
                let contract = await vh.fast_contract_address_retrieval(result[input.denominated_by]);
                args[key] = ethers.parseUnits(result[key].toString(), contract.children[0].fields.decimals).toString();
            }
            else if (input.type == 'address') {
                let contract = await vh.fast_contract_address_retrieval(result[key])
                args[key] = contract.children[0].fields.contract_address
            } else {
                args[key] = result[key]
            }
        } else {
            if (input.type == 'caller_address') {
                 // once we know how syndicate account abstraction works, we would fire in the user's address.
                args[key] = "0x7bb037dad988406e1e399780e508518599cd4370"
            }
            else if (input.type == "contract_address") {
                args[key] = func.fields.contract_address
            }
            else {
                args[key] = ''
            }
        } 
    }
    return args
}

export default TransactionHandler

// keep this comment because it's the only reference for using syndicate's sendTransactionWithValue endpoint.
// async wrapEth() {
//     const data = {
//         chainId: 8453, // BASE network ID
//         contractAddress: "0x4200000000000000000000000000000000000006", // wETH contract address
//         functionSignature: "deposit()",
//         projectId: '1cf04049-290b-4e58-946c-d8928ccba193', // Syndicate project ID
//         value: ethers.parseUnits("0.0005", 18).toString() // 
//       };
      
//       const config = {
//         headers: {
//           'Authorization': `Bearer ${process.env.SYNDICATE_API_KEY}`,
//           'Content-Type': 'application/json'
//         } 
//       };
      
//       axios.post('https://api.syndicate.io/transact/sendTransactionWithValue', data, config)
//         .then(response => {
//           console.log(response.data);
//         })
//         .catch(error => {
//           console.log(error.response);
//         });
// }