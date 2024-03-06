declare var require: any


/// for populating the postgres db with tables.

const knex = require('knex')({
    client: 'pg',
    connection: {
      host : '127.0.0.1',
      port : 5432,
      user : 'postgres',
      password : "example",
      database : 'errors'
    }
  });

knex.schema.dropTableIfExists('all_errors').then(()=>console.log("all_errors table destroyed")).catch((err: any) => { console.error(err); throw err; })
knex.schema.dropTableIfExists('classification_errors').then(()=>console.log("classification table destroyed")).catch((err: any) => { console.error(err); throw err; })
knex.schema.dropTableIfExists('data_errors').then(()=>console.log("data table destroyed")).catch((err: any) => { console.error(err); throw err; })
knex.schema.dropTableIfExists('parameter_errors').then(()=>console.log("parameter table destroyed")).catch((err: any) => { console.error(err); throw err; })
knex.schema.dropTableIfExists('transaction_errors').then(()=>console.log("transaction table destroyed")).catch((err: any) => { console.error(err); throw err; })

knex.schema.createTable('all_errors', function (table: any) {
    table.increments();
    table.string("user_input");
    table.string("type");
    table.string("message");
    table.json('data');
    table.timestamps();
  }).then(() => console.log("all_errors table created"))
  .catch((err: any) => { console.error(err); throw err; })
  .finally(() => knex.destroy()); // Close the connection pool

knex.schema.createTable('classification_errors', function (table: any) {
    table.increments();
    table.string("user_input");
    table.string("type");
    table.string("message");
    table.json('data');
    table.timestamps();
  }).then(() => console.log("classification_errors table created"))
  .catch((err: any) => { console.error(err); throw err; })
  .finally(() => knex.destroy()); // Close the connection pool

  knex.schema.createTable('data_errors', function (table: any) {
    table.increments();
    table.string("user_input");
    table.string("type");
    table.string("message");
    table.json('data');
    table.timestamps();
  }).then(() => console.log("data_errors table created"))
  .catch((err: any) => { console.error(err); throw err; })
  .finally(() => knex.destroy()); // Close the connection pool

  knex.schema.createTable('parameter_errors', function (table: any) {
    table.increments();
    table.string("user_input");
    table.string("type");
    table.string("message");
    table.json('data');
    table.timestamps();
  }).then(() => console.log("parameter_errors table created"))
  .catch((err: any) => { console.error(err); throw err; })
  .finally(() => knex.destroy()); // Close the connection pool

  knex.schema.createTable('transaction_errors', function (table: any) {
    table.increments();
    table.string("user_input");
    table.string("type");
    table.string("message");
    table.json('data');
    table.timestamps();
  }).then(() => console.log("transaction_errors table created"))
  .catch((err: any) => { console.error(err); throw err; })
  .finally(() => knex.destroy()); // Close the connection pool