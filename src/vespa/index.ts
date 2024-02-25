import axios from 'axios';
import qs from 'qs';

import {VESPA_SCHEMA, VespaContractResponse, VespaFunctionResponse, VespaDocumentResponse, NewFunctionSchema, VespaFunctionResponseData, VespaContractResponseData} from './types'
import { VespaError } from '../errors';
import {VESPA_ERROR_CLASSES} from '../errors/types'
/// VespaHandler responsible for handling all vespa calls.
class VespaHandler {
    
    /// Entrypoint for any vespa query.
    ///
    /// Args:
    ///     text: string - the text you want to find
    ///     schema: string - the schema you want to search
    /// Returns:
    ///     VespaResponseData
    async query(text: string, schema: VESPA_SCHEMA): Promise<VespaFunctionResponseData> {
        let body;

        if (schema == VESPA_SCHEMA.FUNCTION) {
            body = create_function_query(text);
        }
        
        try {
            const requestURL = `${process.env.VESPA_SEARCH_ENDPOINT}/?${qs.stringify(body)}`;
            const result: VespaFunctionResponse = await axios.get(requestURL);
            return result.data.root
        } catch (error) {
            throw new VespaError('Querying Vespa failed. Is the vespa container running?', VESPA_ERROR_CLASSES.NOT_RUNNING, {'function': 'query', 'user_input': text, 'schema': schema, 'inputs': body || {}, 'message': error as string})
        }
    }

    /// The least amount of compute possible for retrieval.
    /// does not guarentee accuracy or a return at all.
    async fast_contract_address_retrieval(symbol: string): Promise<VespaContractResponseData> {
        const body = create_contract_query(symbol);
        const requestURL = `${process.env.VESPA_SEARCH_ENDPOINT}?${qs.stringify(body)}`;
        try {
            const result: VespaContractResponse = await axios.get(requestURL);
            return result.data.root
        } catch(error) {
            throw new VespaError("fast_contract_address_retrieval errored.", VESPA_ERROR_CLASSES.NOT_FOUND, { "function": "fast_contract_address_retrieval", "message": error as string, "schema": VESPA_SCHEMA.CONTRACT,"inputs": {"symbol":symbol}})
        }
    }

    /// Returns a function by its ID.
    ///
    /// Args:
    ///     id: string - the id you are searching for
    /// Returns:
    ///     VespaResponse
    async get_function_by_id(id: string): Promise<NewFunctionSchema> {
        const requestURL = `${process.env.VESPA_BASE_ENDPOINT}document/v1/pintxo/function/docid/${id}`;
        try {
            const result: VespaDocumentResponse = await axios.get(requestURL);
            return result.data
        } catch(error) {
            throw new VespaError("get_function_by_id errored.", VESPA_ERROR_CLASSES.NOT_FOUND, { "function": "get_function_by_id", "message": error as string, "schema": VESPA_SCHEMA.FUNCTION,"inputs": {"id":id}})
        }
    }
}

/// todo, this query creation needs to be abstracted away.
/// until we unify the backend and figure that out, all queries will be different. 
/// so gonna hardcode each schema (ie, 'function' or 'contract') as a diff query creation.
function create_function_query(text: string, limit: number = 5): Record<string, string> {
    return {
        "input.query(q)": `embed(e5, @query)`,
        "input.query(qt)": `embed(colbert, @query)`,
        "query": text,
        "ranking": "e5-colbert",
        "timeout" : "10s",
        "yql" : `select * from function where {targetHits: 100}nearestNeighbor(e5_embedding, q) limit ${limit}`
    }
}

function create_contract_query(text: string, limit: number = 3) {
    return {
        "query": text,
        "input.query(q)": `embed(e5, @query)`,
        "timeout" : "10s",
        "yql" : `select * from contract where userQuery() or ({targetHits: 100}nearestNeighbor(symbol_embedding, q)) or ({targetHits: 100}nearestNeighbor(name_embedding, q)) limit ${limit}`
    }
}

// function create_protocol_query(text: string, limit: number = 3) {
//     return {
//         "query": text,
//         "input.query(q)": `embed(e5, @query)`,
//         "timeout" : "10s",
//         "yql" : `select * from protocol where userQuery() or ({targetHits: 100}nearestNeighbor(symbol_embedding, q)) or ({targetHits: 100}nearestNeighbor(name_embedding, q)) limit ${limit}`
//     }
// }

// function create_metric_query(text: string, limit: number = 3) {
//     return {
//         "query": text,
//         "input.query(q)": `embed(e5, @query)`,
//         "timeout" : "10s",
//         "yql" : `select * from metric where userQuery() or ({targetHits: 100}nearestNeighbor(symbol_embedding, q)) or ({targetHits: 100}nearestNeighbor(name_embedding, q)) limit ${limit}`
//     }
// }

export default VespaHandler