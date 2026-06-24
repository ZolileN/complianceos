import { Redis } from 'ioredis';

// Create a single Redis instance to be reused
export const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
