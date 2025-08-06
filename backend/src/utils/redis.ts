import Redis from 'ioredis';
import { redisConfig } from '../config';

class RedisClient {
  private client: Redis;
  private static instance: RedisClient;

  private constructor() {
    this.client = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      retryStrategy: (times) => {
        // Stop retrying after 3 attempts
        if (times > 3) {
          console.log('WARNING: Redis not available - running without caching');
          console.log('   To enable Redis, install Docker and run: docker compose up -d redis');
          return null;
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    this.client.on('connect', () => {
      console.log('Redis connected successfully');
    });

    this.client.on('error', (err) => {
      console.error('ERROR: Redis Client Error:', err);
    });
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  public getClient(): Redis {
    return this.client;
  }

  // Cache operations
  public async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  public async set(key: string, value: string, expireInSeconds?: number): Promise<void> {
    if (expireInSeconds) {
      await this.client.setex(key, expireInSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  public async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  public async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  public async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  // Hash operations
  public async hget(key: string, field: string): Promise<string | null> {
    return await this.client.hget(key, field);
  }

  public async hset(key: string, field: string, value: string): Promise<void> {
    await this.client.hset(key, field, value);
  }

  public async hgetall(key: string): Promise<Record<string, string>> {
    return await this.client.hgetall(key);
  }

  // List operations
  public async lpush(key: string, ...values: string[]): Promise<number> {
    return await this.client.lpush(key, ...values);
  }

  public async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return await this.client.lrange(key, start, stop);
  }

  // Set operations for rate limiting
  public async incr(key: string): Promise<number> {
    return await this.client.incr(key);
  }

  public async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }

  // Pub/Sub operations for real-time features
  public subscribe(channel: string, callback: (message: string) => void): void {
    const subscriber = this.client.duplicate();
    subscriber.subscribe(channel);
    subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        callback(message);
      }
    });
  }

  public async publish(channel: string, message: string): Promise<number> {
    return await this.client.publish(channel, message);
  }

  // Clean up
  public async disconnect(): Promise<void> {
    await this.client.quit();
  }
}

const redisClient = RedisClient.getInstance();
export default redisClient;
export { RedisClient, redisClient };
