/**
 * Normalize DATABASE_URL for Neon + node-pg (shared by pool + migrate script).
 * See pool.js / README for behaviour notes.
 */
export function normalizeDatabaseUrl(raw) {
  if (raw == null || raw === '') return raw;
  let u = String(raw).trim();
  u = u.replace(/[\r\n]+/g, '');
  u = u.replace(/^psql\s+/i, '');
  while (
    (u.startsWith('"') && u.endsWith('"')) ||
    (u.startsWith("'") && u.endsWith("'"))
  ) {
    u = u.slice(1, -1).trim();
  }
  const pgAt = u.search(/postgresql:\/\//i);
  if (pgAt > 0) {
    u = u.slice(pgAt);
  }
  u = u.replace(/[?&]channel_binding=[^&]*/gi, '');
  u = u.replace(/\?&+/g, '?').replace(/&&+/g, '&').replace(/&$/g, '');
  if (/neon\.tech/i.test(u) && !/[?&]sslmode=/i.test(u)) {
    u += u.includes('?') ? '&sslmode=require' : '?sslmode=require';
  }
  return u;
}
