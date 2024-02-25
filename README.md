# pintxo-node-api

## setup

`pnpm install`

`npx ts-node src/app.ts`

## docker

### just a redis instance
`docker run -p 6379:6379 -it redis/redis-stack-server:latest` 

### all services

`docker compose up --build`

### tips

download redis insights for visualizing the db.

## TODO

~~- write vespa handler~~
~~- abstract transaction handler to take kwargs~~
~~- write query handler~~