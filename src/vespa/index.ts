import axios from 'axios';
import qs from 'qs';

import {VESPA_SCHEMA, VespaResponse, VespaDocumentResponse, type ContractChild, type FunctionEntry} from './types'
import { VespaError } from '../errors';
import {VESPA_ERROR_CLASSES} from '../errors/types'
import { NotImplemented } from '@feathersjs/errors';

/// VespaHandler responsible for handling all vespa calls.
export class VespaHandler {
    
    /// Entrypoint for any vespa query.
    ///
    /// Args:
    ///     text: string - the text you want to find
    ///     schema: string - the schema you want to search
    /// Returns:
    ///     VespaResponseData
    async query(text: string, schema: VESPA_SCHEMA): Promise<VespaResponse> {
        if (schema == VESPA_SCHEMA.FUNCTION) {
            return await this.get_function(text);
        } else if (schema == VESPA_SCHEMA.CONTRACT) {
            return await this.fast_contract_address_retrieval(text);
        } else {
            throw new NotImplemented("VESPA_SCHEMA.PROTOCOL or VESPA_SCHEMA.METRIC have not been implemented yet in VespaHandler.query()");
        }
    }

    /// The least amount of compute possible for retrieval.
    /// does not guarentee accuracy or a return at all.
    async fast_contract_address_retrieval(symbol: string): Promise<VespaResponse> {
        const body = create_contract_query(symbol);
        const requestURL = `${process.env.VESPA_SEARCH_ENDPOINT}?${qs.stringify(body)}`;
        try {
            const result: VespaResponse = await axios.get(requestURL);
            return result
        } catch(error) {
            throw new VespaError("fast_contract_address_retrieval errored.", VESPA_ERROR_CLASSES.NOT_FOUND, { "function": "fast_contract_address_retrieval", "message": error as string, "schema": VESPA_SCHEMA.CONTRACT,"inputs": {"symbol":symbol}})
        }
    }

    async get_function(text: string): Promise<VespaResponse> {
        let body;
        try {
            body = create_function_query(text);
            const requestURL = `${process.env.VESPA_SEARCH_ENDPOINT}/?${qs.stringify(body)}`;
            const result: VespaResponse = await axios.get(requestURL);
            return result
        } catch (error) {
            throw new VespaError('Querying Vespa failed. Is the vespa container running?', VESPA_ERROR_CLASSES.NOT_RUNNING, {'function': 'query', 'user_input': text, 'schema': VESPA_SCHEMA.FUNCTION, 'inputs': body || {}, 'message': error as string})
        }
    }

    /// Returns a function by its ID.
    ///
    /// Args:
    ///     id: string - the id you are searching for
    /// Returns:
    ///     VespaResponse
    async get_function_by_id(id: string): Promise<VespaDocumentResponse> {
        const requestURL = `${process.env.VESPA_BASE_ENDPOINT}document/v1/pintxo/function/docid/${id}`;
        try {
            const result: VespaDocumentResponse = await axios.get(requestURL);
            return result
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

