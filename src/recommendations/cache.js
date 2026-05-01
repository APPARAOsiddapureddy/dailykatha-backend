import { redis } from '../services/redis.js';

export async function getCachedFeed(key) {
  try {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

export async function setCachedFeed(key, data, ttlSeconds = 900) {
  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  } catch (err) {
    console.warn('Cache set failed:', err.message);
  }
}

