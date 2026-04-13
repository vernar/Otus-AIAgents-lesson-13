import { useState } from 'react';
import { useGraph } from '../hooks/useGraph.js';
import GraphView from '../components/GraphView.jsx';
import GraphFilterBar from '../components/GraphFilterBar.jsx';
import NodeDetailPanel from '../components/NodeDetailPanel.jsx';

export default function GraphPage() {
  const { elements, filterType, setFilterType, loading } = useGraph();
  const [selectedNode, setSelectedNode] = useState(null);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        height: 56, background: '#0f172a', display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: 16, flexShrink: 0, borderBottom: '1px solid #1e293b',
      }}>
        <span style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>Граф знаний</span>
        {loading && <span style={{ color: '#64748b', fontSize: 12 }}>Загрузка...</span>}
        <div style={{ flex: 1 }} />
        <GraphFilterBar filterType={filterType} setFilterType={setFilterType} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {elements.nodes.length === 0 && !loading ? (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 12, color: '#475569',
          }}>
            <span style={{ fontSize: 48 }}>◎</span>
            <span style={{ fontSize: 14 }}>Граф пуст — добавьте первую статью</span>
          </div>
        ) : (
          <GraphView elements={elements} onNodeClick={setSelectedNode} />
        )}
        {selectedNode && (
          <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
        )}
      </div>
    </div>
  );
}
