import { feathers } from '@feathersjs/feathers'
import { koa, rest, bodyParser, errorHandler, serveStatic } from '@feathersjs/koa'
import { ethers } from "ethers";

import TransactionHandler from './transactions'
import VespaHandler from './vespa'
import LMHandler from './lm';

let th = new TransactionHandler();
let vh = new VespaHandler();
let lm = new LMHandler();

interface Query {
  type? : string
  text: string,
}

interface Function {
  documentid: string,
  name: string,
  description: string,
  signature: string,
  functional_signature: string,
  contract_address: string,
  inputValues: [],
  prerequisites: []
}
enum VESPA_SCHEMA {
  FUNCTION,
  CONTRACT
}

class QueryService {
    async get(query: string) {
      let top_3_function_signatures = await vh.query(query, VESPA_SCHEMA.FUNCTION);
      let formatted_function_signatures = top_3_function_signatures.map(entry => `signature:"${entry.fields.functional_signature}"\ndescription:"${entry.fields.description}"`).join('\n\n'); 
      console.log(formatted_function_signatures)

      let result = await lm.extract_function_parameters(query, formatted_function_signatures);
      let chosen_function = await vh.get_function_by_id(result.function.value);

      for (const [key, {value, value_type}] of Object.entries(result)) {
        if (value_type == 'address') {
          let new_value = await vh.fast_contract_address_retrieval(value)
          result[key].value = new_value.contract_address;

          // add some sort of relationship between these two in the document?
          // some sort of graph parse to validate all relationships or something.
          // maybe that is overkill, and the existance of inputToken is enough to assume inputTokenAmount should also be in the signature.
          if (key == 'inputToken'){
            result['inputTokenAmount'].value = ethers.parseUnits(result['inputTokenAmount'].value, new_value.decimals).toString();
          }
        }
      }


      // let tx = await th.execute_function(chosen_function.fields.signature, chosen_function.fields.contract_address, result);

      // return tx
      return result
    }
}

// This tells TypeScript what services we are registering
type ServiceTypes = {
  query: QueryService
}

// Creates an KoaJS compatible Feathers application
const app = koa<ServiceTypes>(feathers())

app.use(errorHandler())
app.use(serveStatic('.'))
app.use(bodyParser())

// Register REST service handler
app.configure(rest())
app.use('query', new QueryService())

// Start the server
app
  .listen(3030)
  .then(() => console.log(`
░▒▓███████▓▒░░▒▓█▓▒░▒▓███████▓▒░▒▓████████▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓██████▓▒░       
░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░   ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░      
░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░   ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░      
░▒▓███████▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░    ░▒▓██████▓▒░░▒▓█▓▒░░▒▓█▓▒░      
░▒▓█▓▒░      ░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░   ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░      
░▒▓█▓▒░      ░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░   ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░      
░▒▓█▓▒░      ░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░   ░▒▓█▓▒░░▒▓█▓▒░░▒▓██████▓▒░       
                                                                             
                                                                             
Live on 3030`))
