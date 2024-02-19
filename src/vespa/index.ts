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
    async query(text: string, category?: string) {
        const body = create_query(text);
        const requestURL = `http://127.0.0.1:8080/search/?${qs.stringify(body)}`;
        const result: VespaResponse = await axios.get(requestURL);
        return result.data.root.children
    }
}

function create_query(text: string) {
    return {
        "input.query(q)": `embed(e5, @query)`,
        "input.query(qt)": `embed(colbert, @query)`,
        "query": text,
        "ranking": "e5-colbert",
        "timeout" : "10s",
        "yql" : "select * from function where {targetHits: 100}nearestNeighbor(e5_embedding, q)"
    }
}

export default VespaHandler