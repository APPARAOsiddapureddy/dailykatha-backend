export function mapQuoteRow(row) {
  return {
    id: row.id,
    category: row.category,
    mood: row.mood,
    section: row.section,
    isFestival: row.is_festival,
    festival: row.festival,
    quote: {
      te: row.quote_te,
      hi: row.quote_hi,
      ta: row.quote_ta,
      kn: row.quote_kn,
      ml: row.quote_ml,
      en: row.quote_en,
    },
    author: {
      te: row.author_te,
      hi: row.author_hi,
      ta: row.author_ta,
      kn: row.author_kn,
      ml: row.author_ml,
      en: row.author_en,
    },
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
