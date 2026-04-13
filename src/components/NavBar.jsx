import { NavLink } from 'react-router-dom';
import LmStatusBadge from './LmStatusBadge.jsx';

const navStyle = ({ isActive }) => ({
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '0 12px', height: 40, borderRadius: 8,
  textDecoration: 'none', fontSize: 11, fontWeight: 600,
  fontFamily: 'monospace', letterSpacing: 2,
  background: isActive ? '#22d3ee' : 'transparent',
  color: isActive ? '#0a0f1c' : '#64748b',
  transition: 'all .15s',
});

export default function NavBar() {
  return (
    <nav style={{
      width: 220, minWidth: 220, height: '100vh',
      background: '#0f172a', display: 'flex', flexDirection: 'column',
      padding: '24px 16px', gap: 8, boxSizing: 'border-box', position: 'sticky', top: 0,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{
          width: 36, height: 36, background: '#22d3ee', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: '#0a0f1c', flexShrink: 0,
        }}>KG</div>
        <span style={{ color: '#fff', fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>
          Граф знаний
        </span>
      </div>

      <NavLink to="/" end style={navStyle}>ГРАФ</NavLink>
      <NavLink to="/list" style={navStyle}>СТАТЬИ</NavLink>
      <NavLink to="/add" style={navStyle}>ДОБАВИТЬ</NavLink>
      <NavLink to="/bulk" style={navStyle}>МАССОВО</NavLink>

      <div style={{ flex: 1 }} />
      <LmStatusBadge />
    </nav>
  );
}
