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

const normalizedUrl = process.env.REDIS_URL?.trim()
  ? normalizeRedisUrl(process.env.REDIS_URL)
  : null;

/** No Redis client unless `REDIS_URL` is set — optional cache/queue only; OTP uses Postgres. */
const KEEP_ALIVE_MS = Number(process.env.REDIS_KEEPALIVE_MS || 10000);

export const redis = normalizedUrl
  ? new Redis(normalizedUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 30000),
      keepAlive: KEEP_ALIVE_MS,
      retryStrategy(times) {
        return Math.min(times * 150 + Math.random() * 250, 15000);
      },
      reconnectOnError(err) {
        const code = err.code || '';
        const msg = String(err.message || '');
        if (
          code === 'ECONNRESET' ||
          code === 'EPIPE' ||
          code === 'ETIMEDOUT' ||
          msg.includes('ECONNRESET') ||
          msg.includes('READONLY')
        ) {
          return true;
        }
        return false;
      },
    })
  : null;

let _lastRedisErrorLogAt = 0;
let _suppressedRedisErrors = 0;

if (redis) {
  redis.on('error', (err) => {
    const now = Date.now();
    if (now - _lastRedisErrorLogAt > 30000) {
      const extra = _suppressedRedisErrors > 0 ? ` (+${_suppressedRedisErrors} suppressed)` : '';
      console.error('Redis error:', err.message, err.code || '', extra);
      _lastRedisErrorLogAt = now;
      _suppressedRedisErrors = 0;
    } else {
      _suppressedRedisErrors += 1;
    }
  });
}

async function delByPattern(pattern) {
  if (!redis) return 0;
  const stream = redis.scanStream({ match: pattern, count: 250 });
  const keys = [];
  for await (const batch of stream) keys.push(...batch);
  if (keys.length) await redis.del(...keys);
  return keys.length;
}

export async function invalidateUserFeedCache(userId) {
  if (!redis) return;
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
  if (!redis) return;
  const patterns = ['feed:*', 'explore:*'];
  for (const p of patterns) {
    try {
      await delByPattern(p);
    } catch (e) {
      console.warn('Redis invalidate failed', p, e.message);
    }
  }
}
