// todo
import 'dotenv/config'
import qs from 'qs';

import { ethers } from "ethers";
import { SyndicateClient } from "@syndicateio/syndicate-node";
import VespaHandler from '../vespa'; 
import { VESPA_SCHEMA, FunctionSchema } from '../vespa/types';
import { InputValue } from '../lm/types';
import LMHandler from '../lm';
import { GeneralError } from '@feathersjs/errors';

// clients
const syndicate = new SyndicateClient({ token: process.env.SYNDICATE_API_KEY || "no syndicate key"})
let vh = new VespaHandler();
let lm = new LMHandler();

const CHAIN_ID=ethers.getNumber(process.env.BASE_CHAIN_ID || 8453);

/// TransactionHandler class for executing transactions.
class TransactionHandler {
    async process(query: string) {
        let top_3_function_signatures = await vh.query(query, VESPA_SCHEMA.FUNCTION);
        let formatted_function_signatures = top_3_function_signatures.map(entry => `signature:"${entry.fields.functional_signature}"\ndescription:"${entry.fields.description}"`).join('\n\n'); 
        
        let parameters = await lm.extract_function_parameters(query, formatted_function_signatures);
        let modified_parameters = await parse_for_contract_address_and_scale_by_decimals(parameters);
        let chosen_function = await vh.get_function_by_id(modified_parameters.function.value);
        let tx = await this.execute(chosen_function, modified_parameters);

        return tx
    }

    // todo: add some type checking for params? Definitely needs some proper validation.
    async execute(func: FunctionSchema, params: any) {
        // call any prerequisite functions
        for (const [key, {id, contract_to_call, function_signature, inputs}] of Object.entries(func.fields.prerequisites)) {
            let args: Record<string, string> = {}
            for (const [key, {corresponds_to, name, value_type}] of Object.entries(inputs)) {
                // special case when the main contract address being called is a param. ie, approvals
                if (corresponds_to == 'contract_address') {
                    args[name] = func.fields.contract_address
                }
                else {
                    args[name] = params[corresponds_to].value
                }
            }
            let tx = await this.__execute_function(function_signature, params[contract_to_call].value, args);
            return tx
        }
    }

    /// this function actually handles execution, all scaling/retrival should be done before inputting into this.
    async __execute_function(function_signature: string, contract_to_call: string, args: Record<string, string>){
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


    /// private method for executing a transaction via execute()
    async a__execute_function(func: FunctionSchema, params: any){
        // TODO: make all of this programmatic, not hard coded.
        // swap is special since we use the 0x api for call data and need to do decoding.
        if (func.fields.signature == 'transformERC20(address inputToken, address outputToken, uint256 inputTokenAmount, uint256 minOutputTokenAmount, (uint32 deploymentNonce, bytes data)[] transformations)') {
            // approval 
            try {
                await syndicate.transact.sendTransaction({
                    projectId: process.env.SYNDICATE_PROJECT_ID || "missing project id",
                    contractAddress: params.inputToken.value,
                    chainId: CHAIN_ID,
                    functionSignature: "approve(address guy, uint256 wad)",
                    args: {
                        guy: func.fields.contract_address,
                        wad: ethers.getNumber(params.inputTokenAmount.value),
                    },
                })
            } catch (error) {
                throw new GeneralError("approval errored", error);
            }
            

            // wait for the approval to get approved by a block.
            // this is temporary, and needs to get fixed.
            await sleep(3000)
            // console.log(params)
            // let zeroex_data = await get_transformation_data_for_swap(params.inputToken.value, params.outputToken.value, params.inputTokenAmount.value);
            
            // let tx = await syndicate.transact.sendTransaction({
            //     projectId: process.env.SYNDICATE_PROJECT_ID || "missing project id",
            //     contractAddress: contract_address,
            //     chainId: CHAIN_ID,
            //     functionSignature: "transformERC20(address inputToken, address outputToken, uint256 inputTokenAmount, uint256 minOutputTokenAmount, (uint32 deploymentNonce, bytes data)[] transformations)",
            //     args: {
            //         inputToken: params.inputToken.value,
            //         outputToken: params.outputToken.value,
            //         inputTokenAmount: ethers.getNumber(params.inputTokenAmount.value),
            //         minOutputTokenAmount: ethers.getNumber(zeroex_data.minOutputTokenAmount),
            //         transformations: zeroex_data.transformations
            //     },
            // })
    
            return "swap!" 
        }
        else {

        }
    }
}

async function get_transformation_data_for_swap(sellToken: string, buyToken: string, sellAmount: string) {
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
    // we need to parse through this
    let transformations = []    
    for (const index in decoded_calldata[4]) {
        transformations.push({"deploymentNonce" : ethers.getNumber(decoded_calldata[4][index][0]), "data": decoded_calldata[4][index][1].toString()})
    }

    return {"minOutputTokenAmount": decoded_calldata[3], "transformations":transformations}
}

async function parse_for_contract_address_and_scale_by_decimals(result: Record<string, InputValue>) {
    for (const [key, {value, value_type}] of Object.entries(result)) {
        if (value_type == 'address') {
            let new_value = await vh.fast_contract_address_retrieval(value)
            result[key].value = new_value.contract_address;

            // add some sort of relationship between these two in the document?
            // some sort of graph parse to validate all relationships or something.
            // maybe that is overkill, and the existance of inputToken is enough to assume inputTokenAmount should also be in the signature.
            if (key == 'inputToken'){
                result['inputTokenAmount'].value = ethers.parseUnits(result['inputTokenAmount'].value, new_value.decimals).toString();
            }
        }
    }
    return result
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export default TransactionHandler

// async approve() {
//     syndicate.transact.sendTransaction({
//         projectId: "1cf04049-290b-4e58-946c-d8928ccba193",
//         contractAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
//         chainId: 8453,
//         functionSignature: "approve(address guy, uint256 wad)",
//         args: {
//             guy: "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
//             wad: ethers.parseUnits("1", 6).toString()
//         }
//     }).then( (tx) => {return tx})
// }
// async aave_deposit() {
//     const data = {
//         chainId: 8453, // BASE network ID
//         contractAddress: "0xa238dd80c259a72e81d7e4664a9801593f98d1c5", // Aave contract address
//         functionSignature: "supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)",
//         projectId: '1cf04049-290b-4e58-946c-d8928ccba193', // Syndicate project ID
//         args: {
//           "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
//           "amount": ethers.parseUnits("0.5", 6).toString(), 
//           "onBehalfOf": "0x7bb037dad988406e1e399780e508518599cd4370",
//           "referralCode": "0",
//         }
//     };

//     const config = {
//         headers: {
//         'Authorization': `Bearer ${process.env.SYNDICATE_API_KEY}`,
//         'Content-Type': 'application/json'
//         } 
//     };
//     axios.post('https://api.syndicate.io/transact/sendTransaction', data, config)
//     .then(response => {
//         console.log(response.data);
//     })
//     .catch(error => {
//         console.log(error.response);
//     });
// }

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