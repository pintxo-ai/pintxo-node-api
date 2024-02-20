// import cors, { CorsOptions } from 'cors';
import cors from '@koa/cors';
import { feathers } from '@feathersjs/feathers'
import { koa, rest, bodyParser, errorHandler, serveStatic } from '@feathersjs/koa'
import TransactionHelper from './transactions'
import QueryHelper from './queries'
import { CohereClient } from "cohere-ai";
// const { CohereClient } = require("cohere-ai");

const corsOptions = {
  origin: ['http://localhost:4321'], // Specify your frontend app's URL
  optionsSuccessStatus: 200
};

const cohere = new CohereClient({
    token: process.env.COHERE_API_KEY || "invalid, set COHERE_API_KEY in .env",
});
// const cohere = new CohereClient({
//     token: "<<apiKey>>",
// });

let th = new TransactionHelper();
let qh = new QueryHelper();

// This is the interface for the message data
interface Message {
  id?: number
  text: string
}

// A messages service that allows us to create new
// and return all existing messages
class MessageService {
  messages: Message[] = []

  async find() {
    // Just return all our messages
    return this.messages
  }

  async create(data: Pick<Message, 'text'>) {
    // The new message is the data text with a unique identifier added
    // using the messages length since it changes whenever we add one
    const message: Message = {
      id: this.messages.length,
      text: data.text
    }

    // Add new message to the list
    this.messages.push(message)

    return message
  }
}

class QueryService {
    async create(data: any) {
      console.log(data)
      //const classify = await cohere.classify({inputs: [data]})
      const classify = await cohere.classify({
          model: 'c59ffc86-0da8-416f-bc60-ee0c2bbbd0e1-ft',
          examples: [],
          inputs: [
              data.user_query,
          ],
      })
  
      // console.log(datra);
      if(classify.classifications[0].prediction === 'data') {
        let result = await qh.call('vespa', data.user_query)
        console.log('RESULT ', result)
        return result
        //return classify 
      }
      if(classify.classifications[0].prediction === 'transaction') {
        //console.log("TXN - ", classify)
        th.call('approve')
        let result = await th.call('swap')
        return result
      }
      // return classify
    }
}

// class VespaService {
//     async get()
// }

// This tells TypeScript what services we are registering
type ServiceTypes = {
  messages: MessageService
  query: QueryService
}

// Creates an KoaJS compatible Feathers application
const app = koa<ServiceTypes>(feathers())
app.use(cors());

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

// For good measure let's create a message
// So our API doesn't look so empty
// app.service('messages').create({
//   text: 'Hello world from the server'
// })