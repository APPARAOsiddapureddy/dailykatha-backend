/**
 * QA test-line shortcuts (`123456xxxx` + fixed OTP) — OFF in production unless explicitly enabled.
 *
 * ENABLE_QA_SHORTCUTS=true  → allow shortcuts (even in production — use only for staging).
 * ENABLE_QA_SHORTCUTS=false → disallow shortcuts everywhere.
 * unset → non-production defaults ON for DX; production defaults OFF.
 */
export function qaShortcutsEnabled() {
  const v = process.env.ENABLE_QA_SHORTCUTS;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return (process.env.NODE_ENV || 'development') !== 'production';
}
