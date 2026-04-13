export async function fetchGraph(type = '') {
  const params = type ? `?type=${type}` : '';
  const r = await fetch(`/api/graph${params}`);
  if (!r.ok) throw new Error('Ошибка загрузки графа');
  return r.json();
}

export async function fetchConcepts(type = '') {
  const params = type ? `?type=${type}` : '';
  const r = await fetch(`/api/concepts${params}`);
  if (!r.ok) throw new Error('Ошибка загрузки концептов');
  return r.json();
}

export async function fetchConcept(id) {
  const r = await fetch(`/api/concepts/${id}`);
  if (!r.ok) throw new Error('Концепт не найден');
  return r.json();
}
