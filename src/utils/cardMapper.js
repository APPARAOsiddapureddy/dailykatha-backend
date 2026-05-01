const LANG_KEYS = ['te', 'hi', 'ta', 'kn', 'ml', 'en'];

function pickLocalizedField(obj, contentLang) {
  if (!obj || typeof obj !== 'object') return '';
  const k = LANG_KEYS.includes(contentLang) ? contentLang : 'en';
  return obj[k] || obj.en || obj.te || '';
}

export function mapCardRow(row, contentLang = 'en') {
  const lang = LANG_KEYS.includes(contentLang) ? contentLang : 'en';
  return {
    id: row.id,
    section: row.section,
    category: row.category,
    mood: row.mood,
    isFestival: row.is_festival,
    festival: row.festival,
    quote: row.quote,
    author: row.author,
    displayQuote: pickLocalizedField(row.quote, lang),
    displayAuthor: pickLocalizedField(row.author, lang),
    createdAt: row.created_at,
    created_at: row.created_at,
  };
}
