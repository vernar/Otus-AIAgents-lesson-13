export async function fetchLmStatus() {
  const r = await fetch('/api/lm/status');
  if (!r.ok) return { online: false };
  return r.json();
}

export async function fetchLmModels() {
  const r = await fetch('/api/lm/models');
  if (!r.ok) return { models: [] };
  return r.json();
}
