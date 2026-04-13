import { useState, useEffect, useCallback } from 'react';
import { fetchArticles, deleteArticle as apiDelete } from '../api/articles.js';

export function useArticles() {
  const [articles, setArticles] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const limit = 20;

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const res = await fetchArticles({ page: p, limit });
      setArticles(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(page); }, [page]);

  const remove = async (id) => {
    if (!window.confirm('Удалить статью и все её концепты?')) return;
    await apiDelete(id);
    load(page);
  };

  return { articles, total, page, setPage, loading, reload: load, remove, limit };
}
