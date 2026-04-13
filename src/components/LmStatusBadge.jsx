import { useLmContext } from '../hooks/useLmModels.js';

export default function LmStatusBadge() {
  const { status, selectedModel, setSelectedModel } = useLmContext();

  return (
    <div style={{ padding: '12px', background: '#1e293b', borderRadius: 10, marginTop: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: status.online ? '#22d3ee' : '#ef4444',
          flexShrink: 0,
        }} />
        <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>LM Studio</span>
        <span style={{ color: '#64748b', fontSize: 10, marginLeft: 'auto' }}>
          {status.online ? 'онлайн' : 'офлайн'}
        </span>
      </div>
      {status.online && status.models?.length > 0 ? (
        <select
          value={selectedModel}
          onChange={e => setSelectedModel(e.target.value)}
          style={{
            width: '100%', background: '#0f172a', color: '#94a3b8',
            border: '1px solid #334155', borderRadius: 6, padding: '4px 6px',
            fontSize: 10, fontFamily: 'monospace', cursor: 'pointer',
          }}
        >
          {status.models.map(m => (
            <option key={m.id} value={m.id}>{m.id}</option>
          ))}
        </select>
      ) : (
        <span style={{ color: '#475569', fontSize: 10, fontFamily: 'monospace' }}>нет моделей</span>
      )}
    </div>
  );
}
