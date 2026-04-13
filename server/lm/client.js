const LM_STUDIO_URL = process.env.LM_STUDIO_URL ?? 'http://localhost:1234';
const LM_TIMEOUT_MS = Number(process.env.LM_TIMEOUT_MS ?? 60_000);

let modelCache = { ts: 0, data: null };

export async function listModels() {
  if (Date.now() - modelCache.ts < 60_000 && modelCache.data) {
    return modelCache.data;
  }
  const res = await fetch(`${LM_STUDIO_URL}/v1/models`, {
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) throw new Error(`LM Studio /v1/models returned ${res.status}`);
  const json = await res.json();
  modelCache = { ts: Date.now(), data: json.data ?? [] };
  return modelCache.data;
}

export async function chatComplete({ modelId, messages }) {
  const res = await fetch(`${LM_STUDIO_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(LM_TIMEOUT_MS),
    body: JSON.stringify({
      model: modelId,
      messages,
      response_format: { type: 'text' },
      temperature: 0.1,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LM Studio error ${res.status}: ${text}`);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? '';
}
