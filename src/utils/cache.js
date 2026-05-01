import Redis from 'ioredis';
import { env } from '../config/env.js';
import { logger } from './logger.js';

export const redis = env.redisUrl ? new Redis(env.redisUrl, { maxRetriesPerRequest: 2 }) : null;

if (redis) {
  redis.on('error', (e) => logger.warn({ err: e }, 'redis error'));
}

export async function cacheGet(key) {
  if (!redis) return null;
  return redis.get(key);
}

export async function cacheSet(key, value, ttlSeconds) {
  if (!redis) return;
  await redis.set(key, value, 'EX', ttlSeconds);
}

