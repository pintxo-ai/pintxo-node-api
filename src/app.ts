import 'dotenv/config';

import { feathers, type HookContext, type NextFunction } from '@feathersjs/feathers'
import { koa, rest, bodyParser, errorHandler, serveStatic } from '@feathersjs/koa'
import { GeneralError } from '@feathersjs/errors';
import QueryHandler from './query';


let qh = new QueryHandler();

class QueryService {
  async get(query: string) {
    let result;
    try {
      result = qh.process(decodeURIComponent(query));
    } catch (error) {
      throw new GeneralError("The QueryService entrypoint failed.");
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

app.use(errorHandler())
app.use(serveStatic('.'))
app.use(bodyParser())

// Register REST service handler
app.configure(rest())
app.use('query', new QueryService())

app.hooks({
  error: {
    all: [
      async (context: HookContext) => {
        console.error(context)
      }
    ]
  }
})

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
