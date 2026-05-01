export const SUPPORTED_LANGS = ['te', 'hi', 'ta', 'kn', 'ml', 'en'];
export const DEFAULT_LANG = 'te';

/**
 * Resolves language for a request using this priority:
 * 1. ?lang= query param
 * 2. Accept-Language header (first match from supported)
 * 3. User profile content_language (from req.user set by auth middleware)
 * 4. Default 'te'
 */
export function resolveLanguage(req) {
  const q = req.query?.lang;
  if (typeof q === 'string' && SUPPORTED_LANGS.includes(q)) return q;

  const accept = req.headers?.['accept-language'];
  if (typeof accept === 'string' && accept.length) {
    const langs = accept
      .split(',')
      .map((l) => l.split(';')[0].trim().toLowerCase().slice(0, 2))
      .filter(Boolean);
    const matched = langs.find((l) => SUPPORTED_LANGS.includes(l));
    if (matched) return matched;
  }

  const u = req.user?.content_language;
  if (typeof u === 'string' && SUPPORTED_LANGS.includes(u)) return u;

  return DEFAULT_LANG;
}

export function languageMiddleware(req, res, next) {
  req.lang = resolveLanguage(req);
  res.setHeader('X-Content-Language', req.lang);
  next();
}

