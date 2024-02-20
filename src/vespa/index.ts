import axios from 'axios';
import qs from 'qs';

import { GeneralError } from '@feathersjs/errors'

interface VespaQueryInput {

}

enum VALUE_TYPES {
    CONTRACT_ADDRESS,
    uint256
}

interface FunctionInputValues {
    name: string,
    schema: string,
    value_type: VALUE_TYPES,
}

interface VespaContractResponse {
    status: number,
    statusText: string,
    url: string,
    data: {
        root: VespaContractResponseData
    },
}

interface VespaDocumentResponse {
    data: {
        fields: FunctionSchema
    }
}

interface VespaContractResponseData {
    id: string,
    relevance: number,
    fields: any,
    coverage: any,
    children: ContractSchema[]
}

interface ContractSchema {
    id: string,
    relevance: string,
    fields: {
        documentid: string,
        decimals: string,
        name: string,
        description: string,
        signature: string,
        functional_signature: string,
        contract_address: string,
        prerequisites: string[],
        input_values: FunctionInputValues[]
    }
}

interface VespaFunctionResponse {
    status: number,
    statusText: string,
    url: string,
    data: {
        root: VespaFunctionResponseData
    },
}

interface VespaFunctionResponseData {
    id: string,
    relevance: number,
    fields: any,
    coverage: any,
    children: FunctionSchema[]
}

interface FunctionSchema {
    id: string,
    relevance?: string,
    fields: {
        documentid: string,
        name: string,
        description: string,
        signature: string,
        functional_signature: string,
        contract_address: string,
        prerequisites: string[],
        input_values: FunctionInputValues[]
    }
}

enum VESPA_SCHEMA {
    FUNCTION,
    CONTRACT
}

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

        try {
            const requestURL = `${process.env.VESPA_SEARCH_ENDPOINT}/?${qs.stringify(body)}`;
            const result: VespaFunctionResponse = await axios.get(requestURL);
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
    async get_function_by_id(id: string) {
        const requestURL = `${process.env.VESPA_BASE_ENDPOINT}document/v1/pintxo/function/docid/${id}`;
        try {
            const result: VespaDocumentResponse = await axios.get(requestURL);
            return result.data.fields
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

export default VespaHandler