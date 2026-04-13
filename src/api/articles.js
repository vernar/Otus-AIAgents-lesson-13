const BASE = '/api/articles';

export async function fetchArticles({ page = 1, limit = 20 } = {}) {
  const r = await fetch(`${BASE}?page=${page}&limit=${limit}`);
  if (!r.ok) throw new Error('Ошибка загрузки статей');
  return r.json();
}

export async function fetchArticle(id) {
  const r = await fetch(`${BASE}/${id}`);
  if (!r.ok) throw new Error('Статья не найдена');
  return r.json();
}

export async function createArticle({ url, modelId }) {
  const r = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, modelId }),
  });
  const data = await r.json();
  if (!r.ok) throw Object.assign(new Error(data.message || 'Ошибка'), data);
  return data;
}

export async function deleteArticle(id) {
  const r = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!r.ok) throw new Error('Ошибка удаления');
  return r.json();
}

export async function reanalyzeArticle(id, modelId) {
  const r = await fetch(`${BASE}/${id}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modelId }),
  });
  if (!r.ok) throw new Error('Ошибка анализа');
  return r.json();
}
