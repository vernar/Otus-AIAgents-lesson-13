import { useNavigate } from 'react-router-dom';
import { useArticles } from '../hooks/useArticles.js';

const SENTIMENT = {
  positive: { bg: '#064e3b', color: '#34d399', label: 'позитивная' },
  negative: { bg: '#7f1d1d55', color: '#f87171', label: 'негативная' },
  neutral:  { bg: '#1e293b',  color: '#94a3b8', label: 'нейтральная' },
};

export default function ArticleListPage() {
  const { articles, total, page, setPage, loading, remove, limit } = useArticles();
  const navigate = useNavigate();
  const totalPages = Math.ceil(total / limit);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        height: 56, background: '#0f172a', display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: 12, flexShrink: 0, borderBottom: '1px solid #1e293b',
      }}>
        <span style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>Статьи</span>
        <span style={{ color: '#64748b', fontSize: 13 }}>{total} статей</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => navigate('/add')} style={{
          height: 36, padding: '0 16px', background: '#22d3ee', border: 'none',
          borderRadius: 8, color: '#0a0f1c', fontWeight: 600, fontSize: 13, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>+ Добавить статью</button>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 160px 130px 110px 90px',
          padding: '10px 16px', color: '#64748b', fontSize: 10,
          fontFamily: 'monospace', fontWeight: 600, letterSpacing: 1.5,
          borderBottom: '1px solid #1e293b', position: 'sticky', top: 0, background: '#0a0f1c',
        }}>
          <span>ЗАГОЛОВОК</span>
          <span>ИСТОЧНИК</span>
          <span>ТОНАЛЬНОСТЬ</span>
          <span>ДАТА</span>
          <span />
        </div>

        {loading && <p style={{ color: '#475569', padding: 16 }}>Загрузка...</p>}

        {!loading && articles.length === 0 && (
          <p style={{ color: '#475569', padding: 16 }}>Статей пока нет</p>
        )}

        {articles.map(a => {
          const s = SENTIMENT[a.sentiment] ?? SENTIMENT.neutral;
          const date = new Date(a.created_at).toLocaleDateString('ru-RU');
          return (
            <div key={a.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 160px 130px 110px 90px',
              padding: '0 16px', height: 52, alignItems: 'center',
              borderBottom: '1px solid #0f172a', cursor: 'pointer',
              transition: 'background .1s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#1e293b11'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span
                style={{ color: '#fff', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12, cursor: 'pointer' }}
                onClick={() => navigate(`/articles/${a.id}`)}
              >{a.title}</span>
              <span style={{ color: '#64748b', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {a.source ? new URL(a.source).hostname : '—'}
              </span>
              <span>
                {a.sentiment ? (
                  <span style={{
                    padding: '2px 10px', borderRadius: 11, background: s.bg,
                    color: s.color, fontSize: 10, fontWeight: 600, fontFamily: 'monospace',
                  }}>{s.label}</span>
                ) : <span style={{ color: '#475569', fontSize: 12 }}>—</span>}
              </span>
              <span style={{ color: '#64748b', fontSize: 12, fontFamily: 'monospace' }}>{date}</span>
              <button onClick={() => remove(a.id)} style={{
                padding: '4px 10px', background: 'transparent', border: '1px solid #7f1d1d44',
                borderRadius: 6, color: '#f87171', fontSize: 11, cursor: 'pointer',
              }}>Удалить</button>
            </div>
          );
        })}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: 8, padding: 16, justifyContent: 'center' }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{
              padding: '6px 14px', background: '#1e293b', border: 'none',
              borderRadius: 6, color: '#fff', cursor: page > 1 ? 'pointer' : 'not-allowed', opacity: page === 1 ? 0.4 : 1,
            }}>←</button>
            <span style={{ color: '#64748b', fontSize: 12, padding: '6px 0' }}>
              {page} / {totalPages}
            </span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{
              padding: '6px 14px', background: '#1e293b', border: 'none',
              borderRadius: 6, color: '#fff', cursor: page < totalPages ? 'pointer' : 'not-allowed', opacity: page === totalPages ? 0.4 : 1,
            }}>→</button>
          </div>
        )}
      </div>
    </div>
  );
}
