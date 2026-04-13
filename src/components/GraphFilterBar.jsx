const FILTERS = [
  { value: '', label: 'Все' },
  { value: 'concept', label: 'Концепт' },
  { value: 'tool', label: 'Инструмент' },
  { value: 'person', label: 'Персона' },
  { value: 'org', label: 'Орг' },
];

export default function GraphFilterBar({ filterType, setFilterType }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: '#64748b', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2 }}>
        ФИЛЬТР:
      </span>
      {FILTERS.map(f => (
        <button key={f.value} onClick={() => setFilterType(f.value)} style={{
          height: 30, padding: '0 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
          fontSize: 11, fontWeight: 600, fontFamily: 'monospace',
          background: filterType === f.value ? '#22d3ee' : '#1e293b',
          color: filterType === f.value ? '#0a0f1c' : '#94a3b8',
          transition: 'all .15s',
        }}>
          {f.label}
        </button>
      ))}
    </div>
  );
}
