const DEBUG = process.env.POSTGRES_DEBUG == 'true' ? true : false

const knex = require('knex')({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    port : 5432,
    user : 'postgres',
    password : process.env.POSTGRES_PASSWORD,
    database : 'errors'
  },
  debug: DEBUG,
});



enum TABLES {
  ALL = "all_errors",
  CE = "classification_errors",
  DE = "data_errors",
  PE = "parameter_errors",
  TE = "transaction_errors"
}

export class DBHandler {
  async submitToDatabase(data: any) {
    data.created_at = new Date();
    knex(TABLES.ALL).insert(data).returning('*').then((res: any) => {});
  }
}