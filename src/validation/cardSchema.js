import { z } from 'zod';

export const LANGS = ['te', 'hi', 'ta', 'kn', 'ml', 'en'];
export const MOODS = ['warm', 'devotional', 'bold', 'festive', 'calm', 'romantic', 'cool'];
export const SECTIONS = ['morning', 'trending', 'festival', 'interests', 'evening'];
export const CATEGORIES = [
  'goodmorning',
  'goodnight',
  'love',
  'bhakti',
  'motivation',
  'festival',
  'family',
  'cinema',
  'heroes',
  'poetry',
  'friendship',
  'birthday',
];

const multiLangString = z.object({
  te: z.string().min(1, 'Telugu is required'),
  hi: z.string().min(1, 'Hindi is required'),
  ta: z.string().min(1, 'Tamil is required'),
  kn: z.string().min(1, 'Kannada is required'),
  ml: z.string().min(1, 'Malayalam is required'),
  en: z.string().min(1, 'English is required'),
});

const authorLangString = z.object({
  te: z.string().max(80).min(1),
  hi: z.string().max(80).min(1),
  ta: z.string().max(80).min(1),
  kn: z.string().max(80).min(1),
  ml: z.string().max(80).min(1),
  en: z.string().max(80).min(1),
});

export const cardSchema = z.object({
  clientTempId: z.string().uuid(),
  section: z.enum(SECTIONS),
  category: z.enum(CATEGORIES),
  mood: z.enum(MOODS),
  isFestival: z.boolean().default(false),
  festival: z.string().nullable().default(null),
  quote: multiLangString,
  author: authorLangString,
});

export const generationOutputSchema = z.object({
  jobId: z.string().uuid(),
  model: z.string(),
  generatedAt: z.string(),
  cards: z.array(cardSchema).min(1),
});

export function validateCard(card) {
  return cardSchema.safeParse(card);
}

export function validateGenerationOutput(output) {
  return generationOutputSchema.safeParse(output);
}

export function validateAllCards(cards) {
  const valid = [];
  const invalid = [];
  for (const card of cards) {
    const result = cardSchema.safeParse(card);
    if (result.success) valid.push(result.data);
    else {
      invalid.push({
        card,
        errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      });
    }
  }
  return { valid, invalid };
}

