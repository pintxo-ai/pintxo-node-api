import axios from 'axios';
import qs from 'qs';

interface VespaQueryInput {

}

interface VespaResponse {
    status: number,
    statusText: string,
    url: string,
    data: {
        root: VespaResponseRoot
    },
}

interface VespaResponseRoot {
    id: string,
    relevance: number,
    fields: any,
    coverage: any,
    children: any
}

class VespaHandler {
    async query(text: string, schema: string = 'function') {
        const body = create_query(text, schema);
        const requestURL = `${process.env.VESPA_SEARCH_ENDPOINT}?${qs.stringify(body)}`;
        const result: VespaResponse = await axios.get(requestURL);

        return result.data.root.children
    }


    /// The least amount of compute possible for retrieval.
    /// does not guarentee accuracy or a return at all.
    async fast_contract_address_retrieval(symbol: string) {
        const body = create_simple_query(symbol);
        const requestURL = `${process.env.VESPA_SEARCH_ENDPOINT}?${qs.stringify(body)}`;
        try {
            const result: VespaResponse = await axios.get(requestURL);
            return result.data.root.children[0].fields.address
        } catch(error) {
            return symbol
        }
        
    }
}

/// todo, this query creation needs to be abstracted away.
function create_query(text: string, schema: string, limit: number = 3) {
    return {
        "input.query(q)": `embed(e5, @query)`,
        "input.query(qt)": `embed(colbert, @query)`,
        "query": text,
        "ranking": "e5-colbert",
        "timeout" : "10s",
        "yql" : `select * from ${schema} where {targetHits: 100}nearestNeighbor(e5_embedding, q) limit ${limit}`
    }
}

function create_simple_query(text: string, limit: number = 3) {
    return {
        "query": text,
        "input.query(q)": `embed(e5, @query)`,
        "timeout" : "10s",
        "yql" : `select * from contract where userQuery() or ({targetHits: 100}nearestNeighbor(symbol_embedding, q)) or ({targetHits: 100}nearestNeighbor(name_embedding, q)) limit ${limit}`
    }
}

export default VespaHandler