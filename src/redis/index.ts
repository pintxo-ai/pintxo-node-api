import { RedisClientType, createClient } from 'redis';

class RedisHandler {
  private client: RedisClientType = createClient();

  constructor() {
    this.connect();
  }

    async connect() {
        try {
            this.client = createClient();
            this.client.on('error', err => console.log('Redis Client Error', err));
            await this.client.connect();
        } catch (error) {
            console.error("Error connecting to Redis:", error);
        }
    }

    async setObject(key: string, value: any) {  // todo, types
        if (!this.client) {
            throw new Error("Redis client not connected");
        }

        try {
            await this.client.set(key, JSON.stringify(value)); 
        } catch (error) {
            console.error("Error setting object in Redis:", error);
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.disconnect();
        }
    }
}

export default RedisHandler