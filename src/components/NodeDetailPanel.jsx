import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchConcept } from '../api/graph.js';
import { fetchArticle } from '../api/articles.js';

const SENTIMENT_COLORS = {
  positive: { bg: '#064e3b', text: '#34d399', label: 'позитивная' },
  negative: { bg: '#7f1d1d33', text: '#f87171', label: 'негативная' },
  neutral:  { bg: '#1e293b',  text: '#94a3b8', label: 'нейтральная' },
};

const TYPE_COLORS = {
  concept: '#7c3aed',
  tool:    '#059669',
  person:  '#b45309',
  org:     '#374151',
  article: '#1e4a7f',
};

const TYPE_LABELS = { concept: 'КОНЦЕПТ', tool: 'ИНСТРУМЕНТ', person: 'ПЕРСОНА', org: 'ОРГ', article: 'СТАТЬЯ' };

export default function NodeDetailPanel({ node, onClose }) {
  const [detail, setDetail] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!node) return;
    setDetail(null);
    const id = node.id.replace(/^[ac]-/, '');
    if (node.type === 'article') fetchArticle(id).then(setDetail).catch(() => {});
    else fetchConcept(id).then(setDetail).catch(() => {});
  }, [node]);

  if (!node) return null;

  const sent = SENTIMENT_COLORS[detail?.sentiment] ?? SENTIMENT_COLORS.neutral;

  return (
    <div style={{
      width: 320, minWidth: 320, height: '100%', background: '#0f172a',
      padding: 20, boxSizing: 'border-box', overflowY: 'auto',
      display: 'flex', flexDirection: 'column', gap: 14, borderLeft: '1px solid #1e293b',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontSize: 17, fontWeight: 700, lineHeight: 1.3, wordBreak: 'break-word' }}>
            {node.label}
          </div>
        </div>
        <button onClick={onClose} style={{
          background: '#1e293b', border: 'none', color: '#94a3b8', borderRadius: 6,
          width: 28, height: 28, cursor: 'pointer', fontSize: 16, flexShrink: 0,
        }}>×</button>
      </div>

      {/* Type badge */}
      <span style={{
        display: 'inline-block', padding: '2px 10px', borderRadius: 12,
        background: (TYPE_COLORS[node.type] ?? '#1e293b') + '22',
        color: TYPE_COLORS[node.type] ?? '#94a3b8',
        fontSize: 10, fontWeight: 700, fontFamily: 'monospace', letterSpacing: 1,
      }}>
        {TYPE_LABELS[node.type] ?? node.type.toUpperCase()}
      </span>

      <div style={{ height: 1, background: '#1e293b' }} />

      {!detail && <p style={{ color: '#475569', fontSize: 12 }}>Загрузка...</p>}

      {/* Article detail */}
      {detail && node.type === 'article' && (
        <>
          {detail.source && (
            <a href={detail.source} target="_blank" rel="noreferrer" style={{
              color: '#22d3ee', fontSize: 12, wordBreak: 'break-all',
            }}>{detail.source}</a>
          )}
          {detail.sentiment && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#64748b', fontSize: 10, fontFamily: 'monospace', letterSpacing: 1 }}>ТОНАЛЬНОСТЬ:</span>
              <span style={{ padding: '2px 10px', borderRadius: 11, background: sent.bg, color: sent.text, fontSize: 10, fontWeight: 600, fontFamily: 'monospace' }}>
                {sent.label}
              </span>
            </div>
          )}
          {detail.summary && (
            <>
              <span style={{ color: '#64748b', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2 }}>РЕЗЮМЕ</span>
              <p style={{ color: '#94a3b8', fontSize: 12, margin: 0, lineHeight: 1.6 }}>{detail.summary}</p>
            </>
          )}
          {detail.concepts?.length > 0 && (
            <>
              <span style={{ color: '#64748b', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2 }}>КОНЦЕПТЫ</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {detail.concepts.map(c => (
                  <span key={c.id} style={{
                    padding: '2px 10px', borderRadius: 12,
                    background: (TYPE_COLORS[c.type] ?? '#1e293b') + '22',
                    color: TYPE_COLORS[c.type] ?? '#94a3b8',
                    fontSize: 11, fontWeight: 600, fontFamily: 'monospace',
                  }}>{c.name}</span>
                ))}
              </div>
            </>
          )}
          <button onClick={() => navigate(`/articles/${detail.id}`)} style={{
            marginTop: 8, padding: '8px 0', background: '#1e293b', border: 'none',
            color: '#22d3ee', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}>
            Открыть полный текст →
          </button>
        </>
      )}

      {/* Concept detail */}
      {detail && node.type !== 'article' && (
        <>
          <span style={{ color: '#64748b', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2 }}>
            СВЯЗАННЫЕ СТАТЬИ
          </span>
          {detail.articles?.length === 0 && (
            <p style={{ color: '#475569', fontSize: 12 }}>Нет связанных статей</p>
          )}
          {detail.articles?.map(a => (
            <div key={a.id} onClick={() => navigate(`/articles/${a.id}`)} style={{
              background: '#1e293b', borderRadius: 8, padding: 12, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{a.title}</span>
              <span style={{ color: '#64748b', fontSize: 11 }}>{a.source}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
