// todo
import 'dotenv/config'
import qs from 'qs';

import { ethers } from "ethers";
import { SyndicateClient } from "@syndicateio/syndicate-node";
import {VespaHandler} from '../vespa'; 
import { VESPA_SCHEMA, FunctionEntry, ContractChild } from '../vespa/types';
import LMHandler from '../lm';
import { TransactionError } from '../errors';
import {TX_ERROR_CLASSES} from '../errors/types';
import { PintxoTransactionResponse } from './types';

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
    
    // process returns the data needed to call a function. This data is then visualized to end user and a 'confirm' is awaited.
    // once confirmed, a new endpoint will be hit specifically for executing the transaction.
    async process(user_input: string): Promise<PintxoTransactionResponse> {
        let vespa_retrieved_functions = await vh.query(user_input, VESPA_SCHEMA.FUNCTION);
        let top_functions_array = vespa_retrieved_functions.data.root.children as FunctionEntry[];

        // format the top_3_function signatures as a string.
        let formatted_function_signatures = top_functions_array.map(entry => `signature:"${entry.fields.functional_signature}"\ndescription:"${entry.fields.description}"`).join('\n\n'); 
        
        // this needs work. probably a finetune is essential.
        let parameters = await lm.extract_function_parameters(user_input, formatted_function_signatures);

        let chosen_function = await vh.get_function_by_id(parameters.function);

        let args = await parse_user_inputted_parameters(chosen_function.data, parameters);

        
        return {
            "type": "transaction",
            "function": chosen_function.data.fields.name,
            "description": chosen_function.data.fields.description,
            "signature": chosen_function.data.fields.signature,
            "functional_signature": chosen_function.data.fields.functional_signature,
            "contract_address": chosen_function.data.fields.contract_address,
            "prerequisites": chosen_function.data.fields.prerequisites,
            "args": args
        }
    }

    // todo: add some type checking for params? Definitely needs some proper validation.
    /// execute function for TransactionHandler.
    /// Args:
    ///     function_signature: string - the function signature you want to call
    ///     args: Record<string, string> - a dictionary that contains all the parameters inside function_signature.
    ///     prerequisites: Prerequisite[] - a list of precursor functions that need to be called onchain. (ie, approve)
    async execute(func: FunctionEntry, args: Record<string, string>) {
        // call any prerequisite functions
        if (func.fields.prerequisites) {
            for (const [key, {id, contract_to_call, signature, inputs}] of Object.entries(func.fields.prerequisites)) {
                let prereq_args: Record<string, string> = {}
                for (const [key, {name, type, corresponds_to}] of Object.entries(inputs)) {
                    // special case when the main contract address being called is a param. ie, approvals
                    if (corresponds_to == 'contract_address') {
                        prereq_args[name] = func.fields.contract_address
                    }
                    else {
                        prereq_args[name] = args[corresponds_to]
                    }
                }

                if (!process.env.DEV){
                    let tx = await this.__execute_function(signature, args[contract_to_call], prereq_args);
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
            throw new TransactionError("syndicate tx call failed.", TX_ERROR_CLASSES.FAILED_TX, {"function": "__execute_function", "message": error as string, "function_signature": function_signature, "contract_to_call": contract_to_call, "args": args});
        }
        return result
    }
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

async function parse_user_inputted_parameters(func: FunctionEntry, result: Record<string, string>): Promise<Record<string, string>> {
    let args: Record<string, string> = {};
    
    for (const [key, input] of Object.entries(func.fields.inputs)) {
        // if our parsed yaml contains the input string
        if (key in result) {
            // if denominated_by is specified, this needs to be scaled. 
            if (input.denominated_by) {
                let contract = (await vh.fast_contract_address_retrieval(result[input.denominated_by])).data.root.children[0] as ContractChild;
                args[key] = ethers.parseUnits(result[key].toString(), contract.fields.decimals).toString();
            }
            else if (input.type == 'address') {
                let contract = (await vh.fast_contract_address_retrieval(result[key])).data.root.children[0] as ContractChild;
                args[key] = contract.fields.contract_address
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


// function parse_and_validate_params(
//     func: NewFunctionSchema,
//     functionParams: Record<string, FunctionParameter>,
//   ): Record<string, string> { 

//     const iface = new Interface(["function "+func.fields.signature]);
    
//     let expectedParams = JSON.parse(iface.formatJson())
    
//     const parsedObject: Record<string, string> = {
//       ...expectedParams[0].inputs.reduce((acc: any, input: any) => ({ ...acc, [input.name]:  '' }), {})
//     };
          
//     for (const key in functionParams) {
//       if (parsedObject.hasOwnProperty(key)) { 
//         const param = functionParams[key];
//         let value = param.value;
        
//         // tiny bit of validation
//         if (param.type === 'address') {
//           if (!ethers.isAddress(value)) throw new GeneralError("not valid address"); 
//         }
//         parsedObject[key] = value; 
//       }
//     }

//     for (const [k, {name, type, denominated_by}] of Object.entries(func.fields.inputs)) {
//         if (parsedObject.hasOwnProperty(name)) { 
//             if (type == 'caller_address') {
//                 // once we know how syndicate account abstraction works, we would fire in this.
//                 parsedObject[name] = "0x7bb037dad988406e1e399780e508518599cd4370"
//             }
//         }
//     }
  
//     return parsedObject; 
//   }

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