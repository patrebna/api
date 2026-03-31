import 'dotenv/config';
import Redis from 'ioredis';
import { readFileSync } from 'fs';

class RedisService {
  private readonly redis: Redis;
  constructor() {
    const host = process.env.REDIS_HOST ?? 'redis';
    const password = process.env.REDIS_PASSWORD ?? '';
    this.redis = new Redis({
      host,
      port: 6379,
      password,
      tls: {
        ca: readFileSync('certs/ca.pem'),
        cert: readFileSync('certs/client-cert.pem'),
        key: readFileSync('certs/client-key.pem'),
        rejectUnauthorized: false,
      },
    });

    this.redis.once('connect', () => {
      console.log('Успешное подключение к хранилищу кэша.');
    });

    this.redis.on('error', console.error.bind(console, 'Ошибка подключения к хранилищу кэша:'));
  }

  getClient(): Redis {
    return this.redis;
  }
  async sendNotificationToBot(key: string, data: string): Promise<void> {
    await this.redis.rpush(key, data);
  }
}

const cache = new RedisService();
export default cache;
