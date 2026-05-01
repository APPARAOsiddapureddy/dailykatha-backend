import { invalidateUserFeedCache, redis } from './redis.js';

/** Shared Redis client (same connection as rate limits / feed cache). */
export function getRedis() {
  return redis;
}

export async function cacheGet(key) {
  try {
    return await redis.get(key);
  } catch (e) {
    console.warn('Redis get failed', e.message);
    return null;
  }
}

export async function cacheSet(key, value, ttlSec) {
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
