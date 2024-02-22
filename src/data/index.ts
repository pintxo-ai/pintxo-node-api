import 'dotenv/config'
import qs from 'qs';
import axios from 'axios';
import { ethers } from "ethers";
import VespaHandler from '../vespa'; 
import { VESPA_SCHEMA } from '../vespa/types';
import { InputValue } from '../lm/types';
import LMHandler from '../lm';
//import { GeneralError } from "@feathersjs/errors";
import { CLASSIFIER_LEVELS } from "../lm/types";

// clients
let vh = new VespaHandler();
let lm = new LMHandler();

const CHAIN_ID=ethers.getNumber(process.env.BASE_CHAIN_ID || 0);

/// DataHandler class for querying data from pintxo vespa engine such as - real-time metrics or general 
/**
 * Handles a user input classfied as "query", orchestrating the data retrieval from pintxo engine such as, live metrics, distinct blockchain info, or if broad enough pipes to perplexity.
 */
class DataHandler {
    async process(query: string) {
        let label_tokens = await lm.classify(decodeURIComponent(query), CLASSIFIER_LEVELS.DATA_LEVEL_ONE);

        // TODO EVENTUALLY - Fine tune model to inject these tokens into YQL, YQL + Simple Query Language
        // PSUDO FOR FUTURE IMP
        // if (labels_tokens > 3) { // if model able to extract sufficent labels to build query, 
        const params = {
            "timeout": "10s",
            "yql": "select * from sources * where userQuery()", //"yql": "select * from {predicted_document} where userQuery();",
            "query": query
        };
    
        const config = {
            headers: {
            'Content-Type': 'application/json'
            } 
        };

        try { // didn't use the vh to handle the query because of the VespaFunctionResponse type, will do tmr
            const pintxoEngineResponse = await axios.post(`${process.env.VESPA_SEARCH_ENDPOINT}`, params, config);
            console.log(pintxoEngineResponse.data);
            return pintxoEngineResponse.data;
        } catch (error) {
            console.log(axios.isAxiosError(error));
            return { 'RESPONSE': 'NOT FOUND' };
        }
        // } else {
            // let perplexityResponse = await lm.perplexity(query);
            // return perplexityResponse
        // }
    }

}

export default DataHandler