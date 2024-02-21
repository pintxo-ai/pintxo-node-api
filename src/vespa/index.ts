import axios from 'axios';
import qs from 'qs';

import { GeneralError } from '@feathersjs/errors'
import {VESPA_SCHEMA, VespaContractResponse, VespaFunctionResponse, VespaDocumentResponse, FunctionSchema} from './types'

/// VespaHandler responsible for handling all vespa calls.
class VespaHandler {
    
    /// Entrypoint for any vespa query.
    ///
    /// Args:
    ///     text: string - the text you want to find
    ///     schema: string - the schema you want to search
    /// Returns:
    ///     VespaResponseData
    async query(text: string, schema: VESPA_SCHEMA) {
        let body;

        if (schema == VESPA_SCHEMA.FUNCTION) {
            body = create_function_query(text);
        } else if (schema == VESPA_SCHEMA.CONTRACT) {
            body = 'should not get here'
        }
        // else if (schema == VESPA_SCHEMA.PROTOCOL) { // TODO: IMPLEMENT ALONG WITH VESPA LABEL FINE TUNE MODEL
        //     body = create_protocol_query(text);
        // }
        // else if (schema == VESPA_SCHEMA.METRIC) {
        //     body = create_metric_query(text);
        // }

        try {
            const requestURL = `${process.env.VESPA_SEARCH_ENDPOINT}/?${qs.stringify(body)}`;
            const result: VespaFunctionResponse = await axios.get(requestURL); // TODO: CREATE PARENT ABSTRACTION FOR VESPA RESPONSE -need to support other schema response or handle this logic differently with respective functions
            return result.data.root.children
        } catch (error) {
            throw new GeneralError('Something went wrong when searching vespa.', error)
        }
    }

    /// The least amount of compute possible for retrieval.
    /// does not guarentee accuracy or a return at all.
    async fast_contract_address_retrieval(symbol: string) {
        const body = create_contract_query(symbol);
        const requestURL = `${process.env.VESPA_SEARCH_ENDPOINT}?${qs.stringify(body)}`;
        try {
            const result: VespaContractResponse = await axios.get(requestURL);
            return result.data.root.children[0].fields
        } catch(error) {
            throw new GeneralError("fast_contract_address_retrieval errored.", error)
        }
    }

    /// Returns a function by its ID.
    ///
    /// Args:
    ///     id: string - the id you are searching for
    /// Returns:
    ///     VespaResponse
    async get_function_by_id(id: string): Promise<FunctionSchema> {
        const requestURL = `${process.env.VESPA_BASE_ENDPOINT}document/v1/pintxo/function/docid/${id}`;
        try {
            const result: VespaDocumentResponse = await axios.get(requestURL);
            return result.data
        } catch(error) {
            throw new GeneralError("get_function_by_id errored.", error)
        }
    }
}

/// todo, this query creation needs to be abstracted away.
/// until we unify the backend and figure that out, all queries will be different. 
/// so gonna hardcode each schema (ie, 'function' or 'contract') as a diff query creation.
function create_function_query(text: string, limit: number = 5) {
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