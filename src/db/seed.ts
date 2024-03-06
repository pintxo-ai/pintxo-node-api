/// for populating the postgres db with tables.

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

const first_error_table = knex.schema.createTable('classification_errors', function (table: any) {
    table.increments();
    table.string('name');
    table.timestamps();
  })
  
(async () => {
    try {
        const result1 = await knex.trx(first_error_table)
        console.log(result1);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log("error", e)
    }
// `text` is not available here
})();
