import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient();

    // Handle error
    this.client.on('error', (error) => {
      console.error(error);
    });
  }

  // Check connection status
  isAlive() {
    return this.client.connected;
  }

  // Get a value from redis server
  async get(key) {
    const getAsync = promisify(this.client.get).bind(this.client);
    const value = await getAsync(key);
    return value;
  }

  // Store a value on the redis server with expiration
  async set(key, value, duration) {
    const setAsync = promisify(this.client.setex).bind(this.client);
    await setAsync(key, duration, value);
  }

  // Delete a value from the server
  async del(key) {
    const delAsync = promisify(this.client.del).bind(this.client);
    await delAsync(key);
  }
}

// Create and export RedisClient class instance
const redisClient = new RedisClient();
export default redisClient;
