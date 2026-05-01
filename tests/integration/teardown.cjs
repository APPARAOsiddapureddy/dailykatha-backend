module.exports = async function teardown() {
  const { pool } = await import('../../src/config/database.js');
  await pool.end().catch(() => {});
  try {
    const { redis } = await import('../../src/utils/cache.js');
    if (redis) await redis.quit();
  } catch {
    /* optional */
  }
};
