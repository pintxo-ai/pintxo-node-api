# pintxo-node-api

## setup

make a file db/password.txt and enter the password you want to access the db with.

`pnpm install`

`docker compose up --build` to initiate the postgres instance.

you can stop the api container after everything starts running.

then seed the db: `npx ts-node src/db/seed.ts`

and finally run the api:

`npx ts-node src/app.ts`

## docker

### all services

`docker compose up --build`

this will start the api and db containers, but the db will not be seeded and will cause errors until you seed it.
once built, you can stop the api and run purely the db, and then run 

`npx ts-node src/db/seed.ts` to seed the db and then

`npx ts-node src/app.ts` for quick development.

