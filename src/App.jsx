import { useState } from 'react';
import LoginPage from './components/LoginPage';
import HendelserPage from './components/HendelserPage';
import HendelseDetailPage from './components/HendelseDetailPage';
import BrukerePage from './components/BrukerePage';
import AdminPage from './components/AdminPage';
import { auth } from './services/api';
import './styles/Global.css';

function isAdmin(user) {
  if (!user) return false;
  // Handle common shapes: role string, roles array, roller array of objects
  if (user.rolle === 'admin') return true;
  if (Array.isArray(user.roles) && user.roles.includes('admin')) return true;
  if (Array.isArray(user.roller) && user.roller.some(r => (r.navn ?? r) === 'admin')) return true;
  return false;
}

const navItem = (key, label) => ({ key, label });

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [page, setPage] = useState('hendelser');
  const [selectedHendelse, setSelectedHendelse] = useState(null);

  async function handleLogout() {
    try { await auth.logout(); } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  const admin = isAdmin(user);

  const navItems = [
    navItem('hendelser', 'Hendelser'),
    ...(admin ? [navItem('brukere', 'Brukere'), navItem('admin', 'Admin')] : []),
  ];

  function navigate(key) {
    setPage(key);
    setSelectedHendelse(null);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        background: 'var(--c-surface)',
        borderBottom: '1px solid var(--c-border)',
        padding: '0 1.5rem',
        display: 'flex',
        alignItems: 'center',
        height: 52,
        gap: '2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: 8, height: 8, background: 'var(--c-accent)', borderRadius: '50%', display: 'block' }} />
          <span style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Hendelsesystem
          </span>
        </div>

        <nav style={{ display: 'flex', gap: '0.25rem' }}>
          {navItems.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => navigate(key)}
              style={{
                padding: '0.3rem 0.75rem',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                background: page === key ? 'var(--c-bg)' : 'transparent',
                color: page === key ? 'var(--c-text)' : 'var(--c-muted)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.875rem',
                fontWeight: page === key ? 500 : 400,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {admin && (
            <span style={{
              fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.07em', color: 'var(--c-accent)',
              border: '1px solid currentColor', borderRadius: '20px',
              padding: '0.1rem 0.5rem',
            }}>Admin</span>
          )}
          <span style={{ fontSize: '0.8rem', color: 'var(--c-muted)' }}>{user.brukernavn}</span>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Logg ut</button>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        {page === 'hendelser' && !selectedHendelse && (
          <HendelserPage onSelect={id => setSelectedHendelse(id)} />
        )}
        {page === 'hendelser' && selectedHendelse && (
          <HendelseDetailPage
            hendelseId={selectedHendelse}
            onBack={() => setSelectedHendelse(null)}
          />
        )}
        {page === 'brukere' && admin && <BrukerePage />}
        {page === 'admin'   && admin && <AdminPage />}
      </main>
    </div>
  );
}