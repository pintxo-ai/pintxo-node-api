// todo
import 'dotenv/config'
import axios from 'axios';

import { CohereClient } from "cohere-ai";

const cohere = new CohereClient({
    token: process.env.COHERE_API_KEY || "invalid, set COHERE_API_KEY in .env",
});


// Facade pattern
class QueryHandler {
    actions: { [key: string]: (data: string) => Promise<any> } = {
        'vespa': this.vespa,
        'perplexity': this.perplexity,
    };

    async call (fun: string, data: string) {
        const func = this.actions[fun];
        if (func) {
            return func(data)
        } else {
            console.log("Action not found:", fun);
        }
    }

    async vespa(user_input: string) {
        console.log(user_input)
        const params = {
            "timeout": "10s",
            "yql": "select * from sources * where userQuery()", //"yql": "select * from {predicted_document} where userQuery();",
            "query": user_input
        };
    
        const config = {
            headers: {
            'Content-Type': 'application/json'
            } 
        };

        try {
            const response = await axios.post('http://localhost:8080/search/', params, config);
            console.log(response.data);
            return response.data; // Return the actual response data
        } catch (error) {
            console.log(axios.isAxiosError(error));
            return { 'RESPONSE': 'NOT FOUND' }; // Return not found only if there is an error
        }
    }

    async perplexity(user_input: string) {
       
        return 'GENERAL ANSWER'
    }
}

export default QueryHandler