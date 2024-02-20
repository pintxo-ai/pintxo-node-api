// todo
import 'dotenv/config'
import axios from 'axios';
import qs from 'qs';
import { ethers } from "ethers";
import { SyndicateClient } from "@syndicateio/syndicate-node";

const syndicate = new SyndicateClient({ token: process.env.SYNDICATE_API_KEY || "invalid, set syndicate key in .env"})

// Facade pattern
class TransactionHandler {
    actions: { [key: string]: () => void } = {
        'swap': this.swap,
        'aave_deposit': this.aave_deposit,
        'aave_withdraw': this.aave_withdraw,
        'approve': this.approve,
    };

    // todo: make this a type.
    async execute_function(data: any){
        // swap is special since we use the 0x api for call data and need to do decoding.
        if (data.name == 'swap') {
            // get_transformation_data_for_swap(data.)
        }
    }

    async call (fun: string) {
        const func = this.actions[fun];
        if (func) {
            return func()
        } else {
            console.log("Action not found:", fun);
        }
    }
    async approve() {
        syndicate.transact.sendTransaction({
            projectId: "1cf04049-290b-4e58-946c-d8928ccba193",
            contractAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            chainId: 8453,
            functionSignature: "approve(address guy, uint256 wad)",
            args: {
                guy: "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
                wad: ethers.parseUnits("1", 6).toString()
            }
        }).then( (tx) => {return tx})
    }
    async aave_deposit() {
        const data = {
            chainId: 8453, // BASE network ID
            contractAddress: "0xa238dd80c259a72e81d7e4664a9801593f98d1c5", // Aave contract address
            functionSignature: "supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)",
            projectId: '1cf04049-290b-4e58-946c-d8928ccba193', // Syndicate project ID
            args: {
              "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
              "amount": ethers.parseUnits("0.5", 6).toString(), 
              "onBehalfOf": "0x7bb037dad988406e1e399780e508518599cd4370",
              "referralCode": "0",
            }
        };
    
        const config = {
            headers: {
            'Authorization': `Bearer ${process.env.SYNDICATE_API_KEY}`,
            'Content-Type': 'application/json'
            } 
        };
        axios.post('https://api.syndicate.io/transact/sendTransaction', data, config)
        .then(response => {
            console.log(response.data);
        })
        .catch(error => {
            console.log(error.response);
        });
    }

    async aave_withdraw() {
        // todo
    }

    async swap() {
        let abi = [
            "function transformERC20(address inputToken, address outputToken, uint256 inputTokenAmount, uint256 minOutputTokenAmount, (uint32 deploymentNonce, bytes data)[] transformations)",
        ];
        
        // iface here is used for encoding/decoding calldata for the EVM.
        const iface  = new ethers.Interface(abi);
        
        const params = {
            sellToken: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', //WETH
            buyToken: '0x4200000000000000000000000000000000000006', //USDC
            sellAmount: ethers.parseUnits('0.05', 6).toString(), // Note that the ETH token uses 6 decimal places, so `sellAmount` is `0.001 * 10^18`.
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

        // send the transaction
        let tx = syndicate.transact.sendTransaction({
            projectId: "1cf04049-290b-4e58-946c-d8928ccba193",
            contractAddress: "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
            chainId: 8453,
            functionSignature: "transformERC20(address inputToken, address outputToken, uint256 inputTokenAmount, uint256 minOutputTokenAmount, (uint32 deploymentNonce, bytes data)[] transformations)",
            args: {
                inputToken: decoded_calldata[0],
                outputToken: decoded_calldata[1],
                inputTokenAmount: ethers.getNumber(decoded_calldata[2]),
                minOutputTokenAmount: ethers.getNumber(decoded_calldata[3]),
                transformations: transformations
            },
        })

        return tx   
    }
    async wrapEth() {
        const data = {
            chainId: 8453, // BASE network ID
            contractAddress: "0x4200000000000000000000000000000000000006", // wETH contract address
            functionSignature: "deposit()",
            projectId: '1cf04049-290b-4e58-946c-d8928ccba193', // Syndicate project ID
            value: ethers.parseUnits("0.0005", 18).toString() // 
          };
          
          const config = {
            headers: {
              'Authorization': `Bearer ${process.env.SYNDICATE_API_KEY}`,
              'Content-Type': 'application/json'
            } 
          };
          
          axios.post('https://api.syndicate.io/transact/sendTransactionWithValue', data, config)
            .then(response => {
              console.log(response.data);
            })
            .catch(error => {
              console.log(error.response);
            });
    }
}

async function get_transformation_data_for_swap(buyToken: string, sellToken: string, sellAmount: string, sellTokenDecimals: number) {
    let abi = [
        "function transformERC20(address inputToken, address outputToken, uint256 inputTokenAmount, uint256 minOutputTokenAmount, (uint32 deploymentNonce, bytes data)[] transformations)",
    ];

    const iface  = new ethers.Interface(abi);
        
    const params = {
        sellToken: sellToken, //WETH
        buyToken: buyToken, //USDC
        sellAmount: ethers.parseUnits(sellAmount, sellTokenDecimals).toString(), // Note that the ETH token uses 6 decimal places, so `sellAmount` is `0.001 * 10^18`.
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

    return transformations
}

export default TransactionHandler