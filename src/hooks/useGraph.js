import { useState, useEffect } from 'react';
import { fetchGraph } from '../api/graph.js';

export function useGraph() {
  const [elements, setElements] = useState({ nodes: [], edges: [] });
  const [filterType, setFilterType] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchGraph(filterType)
      .then(setElements)
      .finally(() => setLoading(false));
  }, [filterType]);

  return { elements, filterType, setFilterType, loading };
}
