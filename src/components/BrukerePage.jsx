import { useState, useEffect } from 'react';
import { brukere, roller, lookup, auth } from '../services/api';
import styles from '../styles/BrukerePage.module.css';

function RegisterModal({ roles, onClose, onCreated }) {
  const [form, setForm] = useState({ brukernavn: '', passord: '', rolleId: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await auth.register(form);
      onCreated(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Registrer bruker</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
        <form onSubmit={handleSubmit} className="stack">
          <div className="field">
            <label>Brukernavn</label>
            <input className="input" required value={form.brukernavn} onChange={e => set('brukernavn', e.target.value)} />
          </div>
          <div className="field">
            <label>Passord</label>
            <input className="input" type="password" required value={form.passord} onChange={e => set('passord', e.target.value)} />
          </div>
          <div className="field">
            <label>Rolle</label>
            <select className="select" value={form.rolleId} onChange={e => set('rolleId', e.target.value)}>
              <option value="">Ingen rolle</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.navn}</option>)}
            </select>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Avbryt</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Registrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RolesModal({ user, allRoles, onClose }) {
  const [userRoles, setUserRoles] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    roller.getForUser(user.id).then(setUserRoles).finally(() => setLoading(false));
  }, [user.id]);

  const assignedIds = new Set(userRoles.map(r => r.rolleId || r.id));

  async function toggle(role) {
    setSaving(true);
    try {
      if (assignedIds.has(role.id)) {
        await roller.remove(user.id, role.id);
        setUserRoles(prev => prev.filter(r => (r.rolleId || r.id) !== role.id));
      } else {
        await roller.assign(user.id, role.id);
        setUserRoles(prev => [...prev, { ...role, rolleId: role.id }]);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Roller — {user.brukernavn}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        {loading ? (
          <div className="loading-center"><span className="spinner" /></div>
        ) : (
          <div className={styles.roleList}>
            {allRoles.map(role => {
              const active = assignedIds.has(role.id);
              return (
                <button
                  key={role.id}
                  className={`${styles.roleToggle} ${active ? styles.roleActive : ''}`}
                  onClick={() => toggle(role)}
                  disabled={saving}
                >
                  <span className={styles.roleIndicator} />
                  {role.navn}
                </button>
              );
            })}
          </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Ferdig</button>
        </div>
      </div>
    </div>
  );
}

export default function BrukerePage() {
  const [users, setUsers]         = useState([]);
  const [roles, setRoles]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [roleModal, setRoleModal] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [u, r] = await Promise.all([brukere.getAll(), lookup.getRoles()]);
        setUsers(u);
        setRoles(r);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleDelete(id) {
    if (!confirm('Slett bruker?')) return;
    try {
      await brukere.delete(id);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Brukere</h1>
        <button className="btn btn-primary" onClick={() => setShowRegister(true)}>+ Registrer bruker</button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="loading-center"><span className="spinner" /></div>
        ) : users.length === 0 ? (
          <div className="empty"><h3>Ingen brukere</h3><p>Registrer den første brukeren.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Brukernavn</th>
                  <th>E-post</th>
                  <th>Roller</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.brukernavn}</strong></td>
                    <td style={{ color: 'var(--c-text-2)' }}>{u.epost || '—'}</td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setRoleModal(u)}
                      >Rediger roller</button>
                    </td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id)}>Slett</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showRegister && (
        <RegisterModal
          roles={roles}
          onClose={() => setShowRegister(false)}
          onCreated={u => { setUsers(prev => [...prev, u]); setShowRegister(false); }}
        />
      )}

      {roleModal && (
        <RolesModal
          user={roleModal}
          allRoles={roles}
          onClose={() => setRoleModal(null)}
        />
      )}
    </div>
  );
}