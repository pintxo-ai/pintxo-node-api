import 'dotenv/config';

import { feathers, type HookContext } from '@feathersjs/feathers'
import { koa, rest, bodyParser, errorHandler, serveStatic, Application } from '@feathersjs/koa'
import { GeneralError } from '@feathersjs/errors';
import QueryHandler from './query';
import RedisHandler from './redis';
import configuration from '@feathersjs/configuration'
import { cors } from '@feathersjs/koa';
import { configurationValidator } from './configuration';
import { FunctionEntry } from './vespa/types';
import TransactionHandler from './transactions';
import { TransactionError } from './errors';
import {TX_ERROR_CLASSES} from './errors/types';

// please increment this everytime the api is redployed to keep errors from being overlapped
let VERSION = "0.1"
let ERRORS = 0

let qh = new QueryHandler();
let rh = new RedisHandler(); 
let th = new TransactionHandler();

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

interface TemporaryInputType {
  user_input: string,
  func: FunctionEntry,
  args: Record<string, string>
}

class TransactionService {
  // user_input: string, func: NewFunctionSchema, args: Record<string, string>
  // todo: types
  async create(data: TemporaryInputType) {
    let result;
    try {
      let tx = await th.execute(data.func, data.args);
      return tx        
    } catch (e) {
      throw new TransactionError("transaction failed.", TX_ERROR_CLASSES.FAILED_TX, {"function": "parse_user_inputted_parameters", "user_input": data.user_input, "message": e as string, "function_signature": data.func.fields.signature, "contract_to_call": data.func.fields.contract_address, "args": data.args, "top_functions": [""]});
    }
  }
}

// This tells TypeScript what services we are registering
type ServiceTypes = {
  query: QueryService
  transact: TransactionService 
}

// Creates an KoaJS compatible Feathers application
const app: Application = koa(feathers())

// Enable CORS (more configuration options later)
app.configure(configuration(configurationValidator))

app.use(cors());
app.use(errorHandler())
app.use(serveStatic('.'))
app.use(bodyParser())

// Register REST service handler
app.configure(rest())

app.use('query', new QueryService());
app.use('transact', new TransactionService())

// this is where the error layer should log the error to redis
app.hooks({
  error: {
    all: [
      async (context: HookContext) => {
        let input_obj = {
          "type" : context.error.className,
          "data" : context.error.data,
          "user_input" : context.arguments[0],
          "message": context.error.message
        }
        rh.setObject(`error_version:${VERSION}_number:${ERRORS}`, input_obj)
        ERRORS = ERRORS +  1
        return context
      }
    ]
  },
})


// save the initial query for accessing in an error.
app.service('query').hooks({
  before: {
    get: [
      async (context: HookContext) => {
        context.data = context.arguments[0]
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
