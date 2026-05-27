import { useState, useEffect } from 'react';
import { brukere, roller, lookup, auth } from '../services/api';
import styles from '../styles/AdminPage.module.css';

// ─── Shared helpers ────────────────────────────────────────────

function Section({ title, description, children }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>{title}</h2>
          {description && <p className={styles.sectionDesc}>{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

// ─── Register user modal ───────────────────────────────────────

function RegisterModal({ roles, onClose, onCreated }) {
  const [form, setForm] = useState({ brukernavn: '', passord: '', epost: '', rolleId: '' });
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
          <div className="form-grid">
            <div className="field">
              <label>Brukernavn</label>
              <input className="input" required value={form.brukernavn} onChange={e => set('brukernavn', e.target.value)} />
            </div>
            <div className="field">
              <label>E-post</label>
              <input className="input" type="email" value={form.epost} onChange={e => set('epost', e.target.value)} />
            </div>
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

// ─── Edit user modal ───────────────────────────────────────────

function EditUserModal({ user, allRoles, onClose, onSaved }) {
  const [form, setForm] = useState({ brukernavn: user.brukernavn || '', epost: user.epost || '' });
  const [userRoles, setUserRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    roller.getForUser(user.id)
      .then(setUserRoles)
      .catch(() => setUserRoles([]))
      .finally(() => setLoadingRoles(false));
  }, [user.id]);

  const assignedIds = new Set(userRoles.map(r => r.rolleId ?? r.id));

  async function toggleRole(role) {
    setSaving(true);
    try {
      if (assignedIds.has(role.id)) {
        await roller.remove(user.id, role.id);
        setUserRoles(prev => prev.filter(r => (r.rolleId ?? r.id) !== role.id));
      } else {
        await roller.assign(user.id, role.id);
        setUserRoles(prev => [...prev, { ...role, rolleId: role.id }]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const updated = await brukere.update(user.id, form);
      onSaved(updated ?? { ...user, ...form });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h2>Rediger bruker</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
        <form onSubmit={handleSave} className="stack">
          <div className="form-grid">
            <div className="field">
              <label>Brukernavn</label>
              <input className="input" value={form.brukernavn}
                onChange={e => setForm(f => ({ ...f, brukernavn: e.target.value }))} required />
            </div>
            <div className="field">
              <label>E-post</label>
              <input className="input" type="email" value={form.epost}
                onChange={e => setForm(f => ({ ...f, epost: e.target.value }))} />
            </div>
          </div>
          <hr className="divider" />
          <div className="field">
            <label>Roller</label>
            {loadingRoles
              ? <div className="loading-center" style={{ padding: '1rem' }}><span className="spinner" /></div>
              : (
                <div className={styles.roleGrid}>
                  {allRoles.map(role => {
                    const active = assignedIds.has(role.id);
                    return (
                      <button
                        key={role.id}
                        type="button"
                        className={`${styles.roleChip} ${active ? styles.roleChipActive : ''}`}
                        onClick={() => toggleRole(role)}
                        disabled={saving}
                      >
                        {active ? '✓ ' : ''}{role.navn}
                      </button>
                    );
                  })}
                </div>
              )
            }
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Avbryt</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : 'Lagre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Lookup table editor ───────────────────────────────────────
// Generic add/display for static lookup tables (statuser, prioriteringer, kategorier, roller)

function LookupTable({ label, items, loading, onAdd, onDelete }) {
  const [newNavn, setNewNavn] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newNavn.trim()) return;
    setSaving(true);
    try {
      await onAdd(newNavn.trim());
      setNewNavn('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.lookupTable}>
      <h3 className={styles.lookupTitle}>{label}</h3>
      {loading ? (
        <div style={{ padding: '1rem 0' }}><span className="spinner" /></div>
      ) : items.length === 0 ? (
        <p style={{ color: 'var(--c-muted)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>Ingen verdier ennå.</p>
      ) : (
        <div className={styles.lookupItems}>
          {items.map(item => (
            <div key={item.id} className={styles.lookupItem}>
              <span>{item.navn}</span>
              {onDelete && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => onDelete(item.id)}
                >✕</button>
              )}
            </div>
          ))}
        </div>
      )}
      {onAdd && (
        <form onSubmit={handleAdd} className={styles.lookupAddRow}>
          <input
            className="input"
            placeholder={`Ny ${label.toLowerCase()}…`}
            value={newNavn}
            onChange={e => setNewNavn(e.target.value)}
          />
          <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>
            {saving ? <span className="spinner" /> : 'Legg til'}
          </button>
        </form>
      )}
    </div>
  );
}

// ─── Main AdminPage ────────────────────────────────────────────

export default function AdminPage() {
  // Users
  const [users, setUsers]       = useState(null);
  const [roles, setRoles]       = useState([]);
  const [editUser, setEditUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Lookup data
  const [statuses, setStatuses]         = useState([]);
  const [priorities, setPriorities]     = useState([]);
  const [categories, setCategories]     = useState([]);
  const [lookupLoading, setLookupLoading] = useState(true);

  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      brukere.getAll(),
      lookup.getRoles(),
      lookup.getStatuses(),
      lookup.getPriorities(),
      lookup.getCategories(),
    ])
      .then(([u, r, s, p, k]) => {
        setUsers(u);
        setRoles(r);
        setStatuses(s);
        setPriorities(p);
        setCategories(k);
      })
      .catch(err => setError(err.message))
      .finally(() => setLookupLoading(false));
  }, []);

  // User actions
  async function handleDeleteUser(id) {
    try {
      await brukere.delete(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      alert(err.message);
    }
  }

  // Note: lookup endpoints in your API are GET-only (no POST/DELETE routes shown).
  // The add/delete handlers below are wired up and ready — connect them when
  // you add those routes to the backend.
  async function handleLookupAdd(setter, endpoint, navn) {
    try {
      // const created = await endpoint(navn);
      // setter(prev => [...prev, created]);
      alert(`Backend POST route needed to add "${navn}"`);
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Admin</h1>
          <p style={{ color: 'var(--c-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Brukere og statiske verdier
          </p>
        </div>
        <span className={styles.adminBadge}>Admin</span>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>{error}</div>}

      {/* ── Users ──────────────────────────────────────────── */}
      <Section
        title="Brukere"
        description="Opprett, rediger og slett brukerkontoer og tilordne roller."
      >
        <div className="card" style={{ padding: 0 }}>
          <div className={styles.tableToolbar}>
            <span style={{ fontSize: '0.8rem', color: 'var(--c-muted)' }}>
              {users ? `${users.length} brukere` : ''}
            </span>
            <button className="btn btn-primary btn-sm" onClick={() => setShowRegister(true)}>
              + Registrer bruker
            </button>
          </div>

          {users === null ? (
            <div className="loading-center"><span className="spinner" /></div>
          ) : users.length === 0 ? (
            <div className="empty"><h3>Ingen brukere</h3></div>
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
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          {u.roller?.length
                            ? u.roller.map(r => (
                              <span key={r.id ?? r} className="badge badge-neutral">{r.navn ?? r}</span>
                            ))
                            : <span style={{ color: 'var(--c-muted)', fontSize: '0.8rem' }}>Ingen</span>
                          }
                        </div>
                      </td>
                      <td>
                        <div className="row" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditUser(u)}>
                            Rediger
                          </button>
                          {deleteConfirm === u.id ? (
                            <>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(u.id)}>Bekreft</button>
                              <button className="btn btn-ghost btn-sm" onClick={() => setDeleteConfirm(null)}>Avbryt</button>
                            </>
                          ) : (
                            <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(u.id)}>Slett</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Section>

      {/* ── Static / lookup values ──────────────────────────── */}
      <Section
        title="Statiske verdier"
        description="Administrer oppslagsverdier brukt i hendelsessystemet."
      >
        <div className={styles.lookupGrid}>
          <LookupTable
            label="Statuser"
            items={statuses}
            loading={lookupLoading}
            onAdd={navn => handleLookupAdd(setStatuses, null, navn)}
          />
          <LookupTable
            label="Prioriteringer"
            items={priorities}
            loading={lookupLoading}
            onAdd={navn => handleLookupAdd(setPriorities, null, navn)}
          />
          <LookupTable
            label="Kategorier"
            items={categories}
            loading={lookupLoading}
            onAdd={navn => handleLookupAdd(setCategories, null, navn)}
          />
          <LookupTable
            label="Roller"
            items={roles}
            loading={lookupLoading}
            onAdd={navn => handleLookupAdd(setRoles, null, navn)}
          />
        </div>
      </Section>

      {showRegister && (
        <RegisterModal
          roles={roles}
          onClose={() => setShowRegister(false)}
          onCreated={u => { setUsers(prev => [...prev, u]); setShowRegister(false); }}
        />
      )}

      {editUser && (
        <EditUserModal
          user={editUser}
          allRoles={roles}
          onClose={() => setEditUser(null)}
          onSaved={updated => {
            setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
            setEditUser(null);
          }}
        />
      )}
    </div>
  );
}