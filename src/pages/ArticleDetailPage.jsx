import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchArticle, reanalyzeArticle } from '../api/articles.js';
import { useLmContext } from '../hooks/useLmModels.js';

const TYPE_COLORS = { concept: '#7c3aed', tool: '#059669', person: '#b45309', org: '#374151' };
const SENTIMENT = {
  positive: { bg: '#064e3b', color: '#34d399', label: 'позитивная' },
  negative: { bg: '#7f1d1d55', color: '#f87171', label: 'негативная' },
  neutral:  { bg: '#1e293b',  color: '#94a3b8', label: 'нейтральная' },
};

export default function ArticleDetailPage() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [reanalyzing, setReanalyzing] = useState(false);
  const { selectedModel } = useLmContext();
  const navigate = useNavigate();

  useEffect(() => {
    fetchArticle(id).then(setArticle).catch(() => navigate('/list'));
  }, [id]);

  const handleReanalyze = async () => {
    if (!selectedModel) return;
    setReanalyzing(true);
    try {
      const updated = await reanalyzeArticle(id, selectedModel);
      setArticle(updated);
    } finally {
      setReanalyzing(false);
    }
  };

  if (!article) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>Загрузка...</div>;

  const s = SENTIMENT[article.sentiment] ?? SENTIMENT.neutral;
  const date = new Date(article.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        height: 56, background: '#0f172a', display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: 12, borderBottom: '1px solid #1e293b', flexShrink: 0,
      }}>
        <button onClick={() => navigate(-1)} style={{
          background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20, padding: 0,
        }}>←</button>
        <span style={{ color: '#fff', fontSize: 18, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {article.title}
        </span>
        <button onClick={handleReanalyze} disabled={reanalyzing || !selectedModel} style={{
          padding: '6px 14px', background: '#1e293b', border: 'none', borderRadius: 8,
          color: '#22d3ee', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          opacity: reanalyzing || !selectedModel ? 0.5 : 1,
        }}>
          {reanalyzing ? 'Анализируем...' : '↺ Перезапустить анализ'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', gap: 0 }}>
        {/* Main content */}
        <div style={{ flex: 1, padding: 32, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760 }}>
          {/* Meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {article.source && (
              <a href={article.source} target="_blank" rel="noreferrer" style={{ color: '#22d3ee', fontSize: 13 }}>
                {article.source}
              </a>
            )}
            <span style={{ color: '#475569', fontSize: 12 }}>{date}</span>
            {article.sentiment && (
              <span style={{ padding: '2px 10px', borderRadius: 11, background: s.bg, color: s.color, fontSize: 10, fontWeight: 600, fontFamily: 'monospace' }}>
                {s.label}
              </span>
            )}
          </div>

          {/* Summary */}
          {article.summary && (
            <div style={{ background: '#1e293b', borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ color: '#64748b', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2, marginBottom: 8 }}>РЕЗЮМЕ</div>
              <p style={{ color: '#94a3b8', fontSize: 14, margin: 0, lineHeight: 1.7 }}>{article.summary}</p>
            </div>
          )}

          {/* Concepts */}
          {article.concepts?.length > 0 && (
            <div>
              <div style={{ color: '#64748b', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2, marginBottom: 10 }}>КОНЦЕПТЫ И ИНСТРУМЕНТЫ</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {article.concepts.map(c => (
                  <span key={c.id} style={{
                    padding: '4px 12px', borderRadius: 12,
                    background: (TYPE_COLORS[c.type] ?? '#1e293b') + '33',
                    color: TYPE_COLORS[c.type] ?? '#94a3b8',
                    fontSize: 12, fontWeight: 600, fontFamily: 'monospace',
                  }}>{c.name}</span>
                ))}
              </div>
            </div>
          )}

          {/* Full text */}
          <div>
            <div style={{ color: '#64748b', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2, marginBottom: 10 }}>ПОЛНЫЙ ТЕКСТ</div>
            <div style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {article.content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
