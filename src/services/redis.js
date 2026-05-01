import Redis from 'ioredis';

/**
 * Render / dashboard copy-paste often prefixes the real URL with CLI junk, e.g.
 * `redis-cli --tls -u redis://default:...@host:6379` which breaks ioredis (EINVAL, bad host).
 * Extract the first redis(s)://... segment and trim whitespace/quotes.
 */
export function normalizeRedisUrl(raw) {
  if (raw == null) return null;
  let s = String(raw).trim().replace(/^['"]|['"]$/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  const m = s.match(/(rediss?:\/\/[^\s"'<>]+)/i);
  if (m) return m[1];
  if (/^rediss?:\/\//i.test(s)) return s;
  return s.length ? s : null;
}

const redisUrl = normalizeRedisUrl(process.env.REDIS_URL);
const effectiveUrl =
  redisUrl || (process.env.NODE_ENV === 'production' ? null : 'redis://127.0.0.1:6379');

if (!effectiveUrl) {
  throw new Error(
    'REDIS_URL is required in production. Paste only the redis:// or rediss:// URL from Upstash (not the redis-cli command, not the REST URL).',
  );
}

export const redis = new Redis(effectiveUrl, {
  maxRetriesPerRequest: null,
  retryStrategy: (times) => Math.min(times * 100, 3000),
  enableReadyCheck: false,
});

redis.on('error', (err) => {
  console.error('Redis error:', err.message);
});

async function delByPattern(pattern) {
  const stream = redis.scanStream({ match: pattern, count: 250 });
  const keys = [];
  for await (const batch of stream) keys.push(...batch);
  if (keys.length) await redis.del(...keys);
  return keys.length;
}

export async function invalidateUserFeedCache(userId) {
  const patterns = [`feed:${userId}:*`, `explore:${userId}:*`];
  for (const p of patterns) {
    try {
      await delByPattern(p);
    } catch (e) {
      console.warn('Redis invalidate failed', p, e.message);
    }
  }
}

export async function invalidateAllFeedCaches() {
  const patterns = ['feed:*', 'explore:*'];
  for (const p of patterns) {
    try {
      await delByPattern(p);
    } catch (e) {
      console.warn('Redis invalidate failed', p, e.message);
    }
  }
}
