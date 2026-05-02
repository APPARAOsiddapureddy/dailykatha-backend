import { invalidateUserFeedCache, redis } from './redis.js';

/** Shared Redis client when `REDIS_URL` is set; otherwise `null`. */
export function getRedis() {
  return redis;
}

export async function cacheGet(key) {
  if (!redis) return null;
  try {
    return await redis.get(key);
  } catch (e) {
    console.warn('Redis get failed', e.message);
    return null;
  }
}

export async function cacheSet(key, value, ttlSec) {
  if (!redis) return;
  try {
    if (ttlSec) await redis.set(key, value, 'EX', ttlSec);
    else await redis.set(key, value);
  } catch (e) {
    console.warn('Redis set failed', e.message);
  }
}

export async function invalidateUserFeed(userId) {
  await invalidateUserFeedCache(userId);
}
