import { useState, useEffect, createContext, useContext } from 'react';
import { fetchLmStatus } from '../api/lm.js';

export const LmContext = createContext(null);

export function useLmModels() {
  const [status, setStatus] = useState({ online: false, models: [] });
  const [selectedModel, setSelectedModel] = useState('');

  const refresh = async () => {
    const s = await fetchLmStatus();
    setStatus(s);
    if (s.models?.length && !selectedModel) {
      setSelectedModel(s.models[0].id);
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, []);

  return { status, selectedModel, setSelectedModel };
}

export function useLmContext() {
  return useContext(LmContext);
}
