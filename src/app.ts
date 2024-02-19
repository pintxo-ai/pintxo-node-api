import { feathers } from '@feathersjs/feathers'
import { koa, rest, bodyParser, errorHandler, serveStatic } from '@feathersjs/koa'

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

class QueryService {
    async get(query: string) {
      // let result = await th.call(data.text)
      let top_3_functions = await vh.query(query);
      let result = await lm.extract_function_parameters(query, top_3_functions);

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
