/** Mask Indian mobile for UI messages: +91-XXXX-XXXX-6789 (last 4 visible). */
export function maskIndiaPhone(digits10) {
  const d = String(digits10 || '').replace(/\D/g, '');
  if (d.length !== 10) return '+91-XXXX-XXXX-XXXX';
  return `+91-XXXX-XXXX-${d.slice(6)}`;
}
