import { useState } from 'react';
import LoginPage from './components/LoginPage';
import HendelserPage from './components/HendelserPage';
import BrukerePage from './components/BrukerePage';
import AdminPage from './components/AdminPage';
import ManagementPage from './components/ManagementPage';
import { auth } from './services/api';
import './styles/Global.css';

function getRole(user) {
  if (!user) return null;
  if (user.rolle) return user.rolle;
  if (Array.isArray(user.roles) && user.roles.length) return user.roles[0];
  if (Array.isArray(user.roller) && user.roller.length) return user.roller[0]?.navn ?? user.roller[0];
  return null;
}

function isAdmin(user) {
  return getRole(user) === 'admin';
}

function isManagement(user) {
  const r = getRole(user);
  return r === 'admin' || r === 'management';
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [page, setPage] = useState('hendelser');
  const [selectedHendelseId, setSelectedHendelseId] = useState(null);

  async function handleLogout() {
    try { await auth.logout(); } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  if (!user) {
    return <LoginPage onLogin={u => setUser(u)} />;
  }

  const admin = isAdmin(user);
  const management = isManagement(user);

  // Funksjon for å hoppe fra oversikt til styring med valgt hendelse
  const handleSelectFromOversikt = (id) => {
    setSelectedHendelseId(id);
    setPage('management');
  };

  const nav = [
    { key: 'hendelser', label: 'Oversikt' },
    management && { key: 'management', label: 'Hendelsestyring' },
    admin && { key: 'admin', label: 'Admin' },
  ].filter(Boolean);

  return (
    <div className="app-container">
      <header style={{
        display: 'flex', alignItems: 'center', gap: '2rem', padding: '1rem 2rem',
        borderBottom: '1px solid var(--c-border)', backgroundColor: '#fff'
      }}>
        <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--c-primary)' }}>Kommune69 Hendelser</div>
        
        <nav style={{ display: 'flex', gap: '1rem' }}>
          {nav.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                setPage(key);
                if (key !== 'management') setSelectedHendelseId(null);
              }}
              className="btn btn-ghost btn-sm"
              style={{ color: page === key ? 'var(--c-primary)' : 'var(--c-text-2)' }}
            >
              {label}
            </button>
          ))}
        </nav>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--c-muted)' }}>{user.brukernavn}</span>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Logg ut</button>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {page === 'hendelser' && (
          <HendelserPage onSelect={handleSelectFromOversikt} />
        )}
        
        {/* FJERNET: && isManagement(user) - nå vises den for alle */}
        {page === 'management' && (
          <ManagementPage 
            initialId={selectedHendelseId} 
            onClearInitial={() => setSelectedHendelseId(null)} 
          />
        )}

        {page === 'brukere' && <BrukerePage />}
        {page === 'admin' && <AdminPage />}
      </main>
    </div>
  );
}