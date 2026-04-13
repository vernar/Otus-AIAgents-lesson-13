import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';

const NODE_STYLES = [
  { selector: 'node[type="article"]',  style: { 'background-color': '#1e4a7f', shape: 'roundrectangle' } },
  { selector: 'node[type="concept"]',  style: { 'background-color': '#7c3aed', shape: 'ellipse' } },
  { selector: 'node[type="tool"]',     style: { 'background-color': '#059669', shape: 'ellipse' } },
  { selector: 'node[type="person"]',   style: { 'background-color': '#b45309', shape: 'ellipse' } },
  { selector: 'node[type="org"]',      style: { 'background-color': '#374151', shape: 'roundrectangle' } },
  {
    selector: 'node',
    style: {
      label: 'data(label)',
      color: '#ffffff',
      'font-size': 11,
      'text-wrap': 'wrap',
      'text-max-width': 120,
      'text-valign': 'center',
      'text-halign': 'center',
      width: 'label',
      height: 36,
      padding: 10,
    },
  },
  {
    selector: 'node:selected',
    style: { 'border-width': 3, 'border-color': '#22d3ee' },
  },
  {
    selector: 'edge',
    style: {
      width: 1.5,
      'line-color': '#334155',
      'target-arrow-color': '#334155',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      opacity: 0.6,
    },
  },
];

export default function GraphView({ elements, onNodeClick }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (cyRef.current) cyRef.current.destroy();

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: [],
      style: NODE_STYLES,
      layout: { name: 'cose', animate: false },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      backgroundColor: '#0a0f1c',
    });

    cyRef.current.on('tap', 'node', e => {
      onNodeClick(e.target.data());
    });
    cyRef.current.on('tap', e => {
      if (e.target === cyRef.current) onNodeClick(null);
    });

    return () => { cyRef.current?.destroy(); cyRef.current = null; };
  }, []);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().remove();
    if (elements.nodes.length) {
      cy.add([...elements.nodes, ...elements.edges]);
      cy.layout({
        name: 'cose',
        animate: false,
        nodeRepulsion: 8000,
        idealEdgeLength: 120,
        edgeElasticity: 100,
        padding: 40,
      }).run();
      cy.fit(undefined, 40);
    }
  }, [elements]);

  return (
    <div ref={containerRef} style={{ flex: 1, height: '100%', background: '#0a0f1c' }} />
  );
}
