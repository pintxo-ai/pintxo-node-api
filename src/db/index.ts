

const knex = require('knex')({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    port : 5432,
    user : 'postgres',
    password : process.env.POSTGRES_PASSWORD,
    database : 'errors'
  }
});

export class DBHandler {
  
  constructor() {
    console.log(process.env.POSTGRES_PASSWORD);    
  }

  test() {
    let result = knex('table')
  .insert({a: 'b'})
  .returning('*')
  .toString();
  console.log(result)
  }
}