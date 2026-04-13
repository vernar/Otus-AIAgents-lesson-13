import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createArticle } from '../api/articles.js';
import { useLmContext } from '../hooks/useLmModels.js';

const STATUS = {
  pending:  { color: '#64748b', label: 'ожидание' },
  loading:  { color: '#22d3ee', label: 'загрузка...' },
  done:     { color: '#34d399', label: 'готово' },
  error:    { color: '#f87171', label: 'ошибка' },
  skipped:  { color: '#fbbf24', label: 'без анализа' },
};

function parseUrls(text) {
  return text
    .split(/[\s,]+/)
    .map(s => s.trim())
    .filter(s => {
      try { new URL(s); return true; } catch { return false; }
    });
}

export default function BulkAddPage() {
  const [text, setText] = useState('');
  const [items, setItems] = useState([]); // { url, status, title, error }
  const [running, setRunning] = useState(false);
  const { selectedModel } = useLmContext();
  const navigate = useNavigate();
  const abortRef = useRef(false);

  const urls = parseUrls(text);

  const updateItem = (idx, patch) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));

  const handleStart = async () => {
    if (!urls.length || running) return;
    abortRef.current = false;
    const initial = urls.map(url => ({ url, status: 'pending', title: '', error: '' }));
    setItems(initial);
    setRunning(true);

    for (let i = 0; i < initial.length; i++) {
      if (abortRef.current) break;
      updateItem(i, { status: 'loading' });
      try {
        const data = await createArticle({ url: initial[i].url, modelId: selectedModel });
        updateItem(i, {
          status: data.analysis_skipped ? 'skipped' : 'done',
          title: data.title,
          id: data.id,
        });
      } catch (e) {
        updateItem(i, { status: 'error', error: e.message || 'Ошибка' });
      }
    }

    setRunning(false);
  };

  const handleStop = () => { abortRef.current = true; };

  const done  = items.filter(i => i.status === 'done' || i.status === 'skipped').length;
  const total = items.length;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        height: 56, background: '#0f172a', display: 'flex', alignItems: 'center',
        padding: '0 24px', borderBottom: '1px solid #1e293b', flexShrink: 0,
      }}>
        <span style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>Массовая загрузка</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 32, display: 'flex', gap: 32 }}>
        {/* Left: input */}
        <div style={{ flex: 1, maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>
              URLs статей
              <span style={{ color: '#64748b', fontWeight: 400, marginLeft: 8, fontSize: 11 }}>
                (через запятую, пробел или с новой строки)
              </span>
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              disabled={running}
              placeholder={`https://habr.com/ru/articles/123456/\nhttps://habr.com/ru/articles/789012/\nhttps://example.com/article`}
              rows={12}
              style={{
                padding: 14, background: '#1e293b', border: '1px solid #334155',
                borderRadius: 10, color: '#fff', fontSize: 13, resize: 'vertical',
                outline: 'none', fontFamily: 'monospace', lineHeight: 1.6,
                boxSizing: 'border-box', width: '100%',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              padding: '6px 14px', background: '#1e293b', borderRadius: 8,
              color: urls.length ? '#22d3ee' : '#475569', fontSize: 12, fontFamily: 'monospace',
            }}>
              {urls.length} URL{urls.length !== 1 ? 's' : ''}
            </div>

            <div style={{
              flex: 1, padding: '6px 14px', background: '#1e293b', borderRadius: 8,
              color: '#64748b', fontSize: 11, fontFamily: 'monospace',
            }}>
              Модель: {selectedModel || 'не выбрана'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleStart}
              disabled={running || !urls.length}
              style={{
                flex: 1, height: 48, background: (running || !urls.length) ? '#1e293b' : '#22d3ee',
                border: 'none', borderRadius: 10, color: '#0a0f1c',
                fontWeight: 700, fontSize: 15, cursor: (running || !urls.length) ? 'not-allowed' : 'pointer',
                transition: 'background .2s',
              }}
            >
              {running ? '⟳ Обработка...' : '✦ Запустить анализ'}
            </button>
            {running && (
              <button
                onClick={handleStop}
                style={{
                  height: 48, padding: '0 20px', background: '#7f1d1d33', border: '1px solid #f87171',
                  borderRadius: 10, color: '#f87171', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}
              >
                Стоп
              </button>
            )}
          </div>

          {/* Progress bar */}
          {total > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'monospace' }}>
                <span style={{ color: '#64748b' }}>Прогресс</span>
                <span style={{ color: '#22d3ee' }}>{done} / {total}</span>
              </div>
              <div style={{ height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', background: '#22d3ee', borderRadius: 3,
                  width: `${total ? (done / total) * 100 : 0}%`,
                  transition: 'width .4s ease',
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Right: results */}
        {items.length > 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ color: '#64748b', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2, marginBottom: 4 }}>
              РЕЗУЛЬТАТЫ
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
              {items.map((item, i) => {
                const st = STATUS[item.status];
                return (
                  <div key={i} style={{
                    background: '#1e293b', borderRadius: 8, padding: '10px 14px',
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    borderLeft: `3px solid ${st.color}`,
                  }}>
                    <span style={{ color: st.color, fontSize: 10, fontFamily: 'monospace', marginTop: 2, minWidth: 60 }}>
                      {st.label}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {item.title ? (
                        <div
                          style={{
                            color: '#fff', fontSize: 12, fontWeight: 600, lineHeight: 1.4,
                            cursor: item.id ? 'pointer' : 'default',
                            textDecoration: item.id ? 'underline' : 'none',
                          }}
                          onClick={() => item.id && navigate(`/articles/${item.id}`)}
                        >
                          {item.title}
                        </div>
                      ) : (
                        <div style={{ color: '#475569', fontSize: 11, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.url}
                        </div>
                      )}
                      {item.error && (
                        <div style={{ color: '#f87171', fontSize: 11, marginTop: 2 }}>{item.error}</div>
                      )}
                    </div>
                    <span style={{ color: '#334155', fontSize: 10, fontFamily: 'monospace', flexShrink: 0 }}>#{i + 1}</span>
                  </div>
                );
              })}
            </div>

            {!running && done > 0 && (
              <button
                onClick={() => navigate('/')}
                style={{
                  marginTop: 8, height: 40, background: '#0f172a', border: '1px solid #22d3ee',
                  borderRadius: 8, color: '#22d3ee', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}
              >
                Смотреть граф →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
