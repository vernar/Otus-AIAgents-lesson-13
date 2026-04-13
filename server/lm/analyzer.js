import { chatComplete } from './client.js';

export function buildPrompt(title, text) {
  return [
    {
      role: 'system',
      content:
        'You are a knowledge extraction assistant. Respond ONLY with valid JSON — no prose, no markdown fences, no explanation.',
    },
    {
      role: 'user',
      content: `Extract structured information from the article below and return ONLY this JSON shape:
{
  "concepts": ["string"],
  "tools": ["string"],
  "persons": ["string"],
  "orgs": ["string"],
  "summary": "2-3 sentence summary in Russian",
  "sentiment": "positive" or "neutral" or "negative"
}

Title: ${title}

Text:
${text.slice(0, 4000)}`,
    },
  ];
}

export function extractJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {}
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {}
  }
  throw new Error('Не удалось распарсить ответ LM Studio как JSON');
}

export async function analyzeArticle({ modelId, title, text }) {
  const messages = buildPrompt(title, text);
  const raw = await chatComplete({ modelId, messages });
  const parsed = extractJson(raw);

  return {
    concepts: Array.isArray(parsed.concepts) ? parsed.concepts : [],
    tools: Array.isArray(parsed.tools) ? parsed.tools : [],
    persons: Array.isArray(parsed.persons) ? parsed.persons : [],
    orgs: Array.isArray(parsed.orgs) ? parsed.orgs : [],
    summary: typeof parsed.summary === 'string' ? parsed.summary : null,
    sentiment: ['positive', 'neutral', 'negative'].includes(parsed.sentiment)
      ? parsed.sentiment
      : 'neutral',
  };
}
