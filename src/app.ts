import { feathers } from '@feathersjs/feathers'
import { koa, rest, bodyParser, errorHandler, serveStatic } from '@feathersjs/koa'

import TransactionHandler from './transactions'
import VespaHandler from './vespa'
import LMHandler from './lm';
import { string } from 'cohere-ai/core/schemas';

let th = new TransactionHandler();
let vh = new VespaHandler();
let lm = new LMHandler();

interface Query {
  type? : string
  text: string,
}

interface Function {
  fields: {
    documentid: string,
    name: string,
    description: string,
    signature: string,
    functional_signature: string,
    contract_address: string,
    inputValues: [],
    prerequisites: []
  }
}

class QueryService {
    async get(query: string) {
      // let result = await th.call(data.text)
      let top_3_function_signatures: Function[] = await vh.query(query);
      let formatted_function_signatures = top_3_function_signatures.map(entry => `input signature:"${entry.fields.functional_signature}"\ndescription:"${entry.fields.description}"`).join('\n\n'); 
      // todo: return type 
      let result = await lm.extract_function_parameters(query, formatted_function_signatures);
      for (const [key, value] of Object.entries(result)) {
        // this conditional does not scale.
        // need to downstream type 'address' from function signature/lm output.
        if (key == 'inputToken' || key == 'outputToken') {
          let new_value = await vh.fast_contract_address_retrieval(result[key])
          result[key] = new_value;
        }
      }
      return result
    }
}

// This tells TypeScript what services we are registering
type ServiceTypes = {
  query: QueryService
}

// Creates an KoaJS compatible Feathers application
const app = koa<ServiceTypes>(feathers())

// Use the current folder for static file hosting
app.use(serveStatic('.'))
// Register the error handle
app.use(errorHandler())
// Parse JSON request bodies
app.use(bodyParser())

// Register REST service handler
app.configure(rest())
app.use('query', new QueryService())

// Start the server
app
  .listen(3030)
  .then(() => console.log('Feathers server listening on localhost:3030'))
