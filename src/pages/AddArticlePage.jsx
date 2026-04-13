import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createArticle } from '../api/articles.js';
import { useLmContext } from '../hooks/useLmModels.js';

const TYPE_COLORS = { concept: '#7c3aed', tool: '#059669', person: '#b45309', org: '#374151' };

const SENTIMENT = {
  positive: { bg: '#064e3b', color: '#34d399', label: 'позитивная' },
  negative: { bg: '#7f1d1d55', color: '#f87171', label: 'негативная' },
  neutral:  { bg: '#1e293b',  color: '#94a3b8', label: 'нейтральная' },
};

export default function AddArticlePage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const { selectedModel } = useLmContext();
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    setStage('Загружаем страницу...');

    try {
      const data = await createArticle({ url: url.trim(), modelId: selectedModel });
      setStage('');
      setResult(data);
    } catch (err) {
      setStage('');
      setError(err.message || 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const allConcepts = result
    ? [
        ...(result.concepts?.map(c => ({ ...c, kind: 'concept' })) ?? []),
      ]
    : [];

  const s = result?.sentiment ? (SENTIMENT[result.sentiment] ?? SENTIMENT.neutral) : null;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        height: 56, background: '#0f172a', display: 'flex', alignItems: 'center',
        padding: '0 24px', borderBottom: '1px solid #1e293b', flexShrink: 0,
      }}>
        <span style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>Добавить статью</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', gap: 32, padding: 32 }}>
        {/* Form */}
        <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640 }}>
          {/* URL field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>URL статьи *</label>
            <input
              type="url" required value={url} onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com/article..."
              disabled={loading}
              style={{
                height: 56, padding: '0 16px', background: '#1e293b', border: '1px solid #334155',
                borderRadius: 10, color: '#fff', fontSize: 15,
                outline: 'none', boxSizing: 'border-box', width: '100%',
              }}
            />
          </div>

          {/* Hint */}
          <div style={{
            display: 'flex', gap: 8, alignItems: 'flex-start',
            background: '#1e293b', borderRadius: 8, padding: '10px 14px',
          }}>
            <span style={{ color: '#22d3ee', fontSize: 14, flexShrink: 0 }}>ℹ</span>
            <span style={{ color: '#64748b', fontSize: 11, lineHeight: 1.5 }}>
              Система автоматически извлечёт заголовок из &lt;title&gt;, текст страницы
              и передаст в модель для анализа
            </span>
          </div>

          {/* Model selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ color: '#94a3b8', fontSize: 12, fontFamily: 'monospace', fontWeight: 600, letterSpacing: 1 }}>
              Модель анализа
            </label>
            <div style={{
              height: 44, background: '#1e293b', borderRadius: 8, padding: '0 14px',
              display: 'flex', alignItems: 'center',
              border: '1px solid #334155',
            }}>
              <span style={{ color: '#fff', fontSize: 13, fontFamily: 'monospace', flex: 1 }}>
                {selectedModel || 'Выберите модель в сайдбаре'}
              </span>
            </div>
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading || !url.trim()} style={{
            height: 48, background: loading ? '#1e293b' : '#22d3ee',
            border: 'none', borderRadius: 10, color: '#0a0f1c',
            fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'background .2s',
          }}>
            {loading ? (
              <><span style={{ color: '#64748b' }}>⟳</span> <span style={{ color: '#64748b' }}>{stage}</span></>
            ) : '✦ Загрузить и проанализировать'}
          </button>

          {error && (
            <div style={{ background: '#7f1d1d33', borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: 13 }}>
              {error}
            </div>
          )}
        </form>

        {/* Result panel */}
        {result && (
          <div style={{ width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#22d3ee' }}>✦</span>
                <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>Результат анализа</span>
                {result.analysis_skipped && (
                  <span style={{ marginLeft: 'auto', padding: '2px 8px', background: '#92400e33', color: '#fbbf24', fontSize: 10, borderRadius: 6, fontFamily: 'monospace' }}>
                    без анализа
                  </span>
                )}
              </div>

              <div style={{ fontWeight: 700, color: '#fff', fontSize: 15, lineHeight: 1.4 }}>{result.title}</div>

              {result.source && (
                <a href={result.source} target="_blank" rel="noreferrer" style={{ color: '#22d3ee', fontSize: 12 }}>
                  {result.source}
                </a>
              )}

              {s && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#64748b', fontSize: 10, fontFamily: 'monospace', letterSpacing: 1 }}>ТОНАЛЬНОСТЬ:</span>
                  <span style={{ padding: '2px 10px', borderRadius: 11, background: s.bg, color: s.color, fontSize: 10, fontWeight: 600, fontFamily: 'monospace' }}>{s.label}</span>
                </div>
              )}

              {result.summary && (
                <>
                  <span style={{ color: '#64748b', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2 }}>РЕЗЮМЕ</span>
                  <p style={{ color: '#94a3b8', fontSize: 12, margin: 0, lineHeight: 1.6 }}>{result.summary}</p>
                </>
              )}

              {result.concepts?.length > 0 && (
                <>
                  <div style={{ height: 1, background: '#0f172a' }} />
                  <span style={{ color: '#64748b', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2 }}>КОНЦЕПТЫ И ИНСТРУМЕНТЫ</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {result.concepts.map(c => (
                      <span key={c.id} style={{
                        padding: '2px 10px', borderRadius: 12,
                        background: (TYPE_COLORS[c.type] ?? '#1e293b') + '33',
                        color: TYPE_COLORS[c.type] ?? '#94a3b8',
                        fontSize: 11, fontWeight: 600, fontFamily: 'monospace',
                      }}>{c.name}</span>
                    ))}
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={() => navigate(`/articles/${result.id}`)} style={{
                  flex: 1, padding: '8px 0', background: '#0f172a', border: 'none',
                  color: '#22d3ee', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                }}>Открыть статью →</button>
                <button onClick={() => navigate('/')} style={{
                  flex: 1, padding: '8px 0', background: '#0f172a', border: 'none',
                  color: '#94a3b8', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                }}>Смотреть граф →</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
