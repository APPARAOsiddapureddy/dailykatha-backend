import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a content generator for Daily Katha, a multilingual Indian greetings app.
OUTPUT: Return ONLY valid JSON. No markdown. No explanation. No code fences.
LANGUAGES: Every card must have quote and author in all 6 scripts: te (Telugu), hi (Hindi), ta (Tamil), kn (Kannada), ml (Malayalam), en (English).
QUALITY: Each translation must be natural and idiomatic in that language — not word-for-word translation.
SAFETY: No film dialogues, no politician names, no medical claims, no explicit content, no hate speech.
STYLE: Short lines (2-4 lines), suitable for WhatsApp status. Warm, respectful tone.`;

export async function generateCards(jobPayload) {
  const {
    jobId,
    interestIds,
    religionId,
    contentLanguage,
    localDate,
    occasions,
    constraints,
  } = jobPayload;

  const userPrompt = `
Generate ${constraints.cardsRequested} quote cards for Daily Katha.

INPUT:
${JSON.stringify(jobPayload, null, 2)}

OUTPUT SCHEMA — return exactly this JSON structure:
{
  "jobId": "${jobId}",
  "model": "claude-sonnet-4-20250514",
  "generatedAt": "<ISO timestamp>",
  "cards": [
    {
      "clientTempId": "<uuid>",
      "section": "<morning|trending|festival|interests|evening>",
      "category": "<one of: ${interestIds.join('|')}>",
      "mood": "<warm|devotional|bold|festive|calm|romantic|cool>",
      "isFestival": false,
      "festival": null,
      "quote": {
        "te": "<Telugu, 2-4 lines, \\\\n between lines>",
        "hi": "<Hindi, 2-4 lines, \\\\n between lines>",
        "ta": "<Tamil, 2-4 lines, \\\\n between lines>",
        "kn": "<Kannada, 2-4 lines, \\\\n between lines>",
        "ml": "<Malayalam, 2-4 lines, \\\\n between lines>",
        "en": "<English, 2-4 lines, \\\\n between lines>"
      },
      "author": {
        "te": "— <attribution in Telugu, max 80 chars>",
        "hi": "— <attribution in Hindi, max 80 chars>",
        "ta": "— <attribution in Tamil, max 80 chars>",
        "kn": "— <attribution in Kannada, max 80 chars>",
        "ml": "— <attribution in Malayalam, max 80 chars>",
        "en": "— <attribution in English, max 80 chars>"
      }
    }
  ]
}

RULES:
- cards array length MUST equal ${constraints.cardsRequested}
- ALL 6 language keys required in quote and author — missing any = invalid
- Distribute cards across categories in interestIds (balanced as possible)
- Religion context: ${religionId || 'neutral/ecumenical'}
- No hashtags, no emoji in quote (except birthday/festival may have one)
- author max 80 characters per language
`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');

  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  return JSON.parse(cleaned);
}
