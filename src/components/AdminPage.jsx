import { useState, useEffect, useCallback } from 'react';
import { brukere, roller, lookup, auth } from '../services/api';
import styles from '../styles/AdminPage.module.css';

// ─── Section wrapper ────────────────────────────────────────────

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

// ─── Register user modal ────────────────────────────────────────

function RegisterModal({ roles, onClose, onCreated }) {
  const [form, setForm] = useState({ brukernavn: '', passord: '', epost: '', displayName: '', fullName: '', rolleId: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        username: form.brukernavn,
        password: form.passord,
        email: form.epost,
        displayName: form.displayName,
        fullName: form.fullName,
      };
      const user = await auth.register(payload);
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
              <input className="input" required value={form.brukernavn}
                onChange={e => set('brukernavn', e.target.value)} />
            </div>
            <div className="field">
              <label>E-post</label>
              <input className="input" type="email" value={form.epost}
                onChange={e => set('epost', e.target.value)} />
            </div>
          </div>
          <div className="form-grid">
            <div className="field">
              <label>Visningsnavn</label>
              <input className="input" value={form.displayName}
                onChange={e => set('displayName', e.target.value)} />
            </div>
            <div className="field">
              <label>Fullt navn</label>
              <input className="input" value={form.fullName}
                onChange={e => set('fullName', e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Passord</label>
            <input className="input" type="password" required value={form.passord}
              onChange={e => set('passord', e.target.value)} />
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

// ─── Edit user modal ────────────────────────────────────────────

function EditUserModal({ user, allRoles, onClose, onSaved }) {
  const [form, setForm] = useState({ brukernavn: user.brukernavn || '', epost: user.epost || '', displayName: user.displayName || '', fullName: user.fullName || '' });
  const [userRoles, setUserRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    roller.getForUser(user.id)
      .then(data => {
        const mapped = Array.isArray(data) ? data.map(d => {
          const norm = normalizeRole(d);
          // preserve backend role id mapping if present
          if (d.Rolle_ID != null) norm.rolleId = d.Rolle_ID;
          if (d.rolleId != null) norm.rolleId = d.rolleId;
          return norm;
        }) : [];
        setUserRoles(mapped);
      })
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
      const payload = {
        username: form.brukernavn,
        email: form.epost,
        displayName: form.displayName,
        fullName: form.fullName,
      };
      const updated = await brukere.update(user.id, payload);
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
              <input className="input" required value={form.brukernavn}
                onChange={e => setForm(f => ({ ...f, brukernavn: e.target.value }))} />
            </div>
            <div className="field">
              <label>E-post</label>
              <input className="input" type="email" value={form.epost}
                onChange={e => setForm(f => ({ ...f, epost: e.target.value }))} />
            </div>
          </div>
          <div className="form-grid">
            <div className="field">
              <label>Visningsnavn</label>
              <input className="input" value={form.displayName}
                onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} />
            </div>
            <div className="field">
              <label>Fullt navn</label>
              <input className="input" value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
            </div>
          </div>
          <hr className="divider" />
          <div className="field">
            <label>Roller</label>
            {loadingRoles ? (
              <div className="loading-center" style={{ padding: '1rem' }}><span className="spinner" /></div>
            ) : allRoles.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--c-muted)' }}>Ingen roller tilgjengelig.</p>
            ) : (
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
            )}
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

// ─── Roles panel ────────────────────────────────────────────────
// Calls GET /roller (roller.getAll) and POST /roller (roller.create)

function RollerPanel({ roles, setRoles, loading }) {
  const [newNavn, setNewNavn] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleAdd(e) {
    e.preventDefault();
    const navn = newNavn.trim();
    if (!navn) return;
    setSaving(true);
    setError('');
    try {
      const created = await roller.create(navn);
      setRoles(prev => [...prev, created]);
      setNewNavn('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const handleGetAll = useCallback(async () => {
    setSaving(true);
    setError('');
    try {
      const all = await roller.getAll();
      setRoles(Array.isArray(all) ? all : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [setRoles]);

  useEffect(() => {
    handleGetAll();
  }, [handleGetAll]);

  return (
    <div className={`card ${styles.panelCard}`}>
      <h3 className={styles.panelTitle}>Roller</h3>
      <p className={styles.panelDesc}>
        Roller brukes til tilgangsstyring og vises som valg ved brukerregistrering og redigering.
      </p>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
        <button className="btn btn-ghost btn-sm" onClick={handleGetAll} disabled={saving || loading}>
          Oppdater
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '0.75rem' }}>{error}</div>}

      {loading ? (
        <div style={{ padding: '0.75rem 0' }}><span className="spinner" /></div>
      ) : roles.length === 0 ? (
        <p style={{ color: 'var(--c-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Ingen roller opprettet ennå.
        </p>
      ) : (
        <div className={styles.panelTable}>
          {roles.map(r => (
            <div key={r.id} className={styles.panelRow}>
              <span className={styles.panelRowId}>#{r.id}</span>
              <span className={styles.panelRowName}>{r.navn}</span>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAdd} className={styles.addRow}>
        <input
          className="input"
          placeholder="Rollenavn (f.eks. «saksbehandler»)…"
          value={newNavn}
          onChange={e => setNewNavn(e.target.value)}
        />
        <button className="btn btn-primary" type="submit" disabled={saving || !newNavn.trim()}>
          {saving ? <span className="spinner" /> : 'Legg til'}
        </button>
      </form>
    </div>
  );
}

// ─── Categories panel ───────────────────────────────────────────
// GET /lookup/kategorier — read only (no standalone POST route on backend)

function KategorierPanel({ categories, loading }) {
  return (
    <div className={`card ${styles.panelCard}`}>
      <h3 className={styles.panelTitle}>Kategorier</h3>
      <p className={styles.panelDesc}>
        Kategorier er globale verdier som kan knyttes til hendelser av management-brukere.
      </p>

      {loading ? (
        <div style={{ padding: '0.75rem 0' }}><span className="spinner" /></div>
      ) : categories.length === 0 ? (
        <p style={{ color: 'var(--c-muted)', fontSize: '0.875rem' }}>Ingen kategorier funnet.</p>
      ) : (
        <div className={styles.panelTable}>
          {categories.map(k => (
            <div key={k.id} className={styles.panelRow}>
              <span className={styles.panelRowId}>#{k.id}</span>
              <span className={styles.panelRowName}>{k.navn}</span>
            </div>
          ))}
        </div>
      )}

      <p className={styles.panelNote}>
        Kategorier opprettes via hendelsesdetaljsiden. Legg til POST /lookup/kategorier i backend for å opprette dem herfra.
      </p>
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────

export default function AdminPage() {
  const [users, setUsers]           = useState(null);
  const [roles, setRoles]           = useState([]);
  const [categories, setCategories] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [editUser, setEditUser]     = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [error, setError]           = useState('');

  useEffect(() => {
    Promise.all([
      brukere.getAll(),
      roller.getAll(),       // GET /roller  — returns all unique roles
      lookup.getCategories(), // GET /lookup/kategorier
    ])
      .then(([u, r, k]) => {
        setUsers(Array.isArray(u) ? u.map(normalizeUser) : []);
        setRoles(Array.isArray(r) ? r.map(normalizeRole) : []);
        setCategories(Array.isArray(k) ? k : []);
      })
      .catch(err => setError(err.message))
      .finally(() => setRolesLoading(false));
  }, []);

  async function handleDeleteUser(id) {
    try {
      await brukere.delete(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      setDeleteConfirm(null);
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
            Kontoer, roller og kategorier
          </p>
        </div>
        <span className={styles.adminBadge}>Admin</span>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>{error}</div>}

      {/* ── Users ─────────────────────────────────────────── */}
      <Section
        title="Kontoer"
        description="Opprett, rediger og slett brukerkontoer. Tildel roller fra redigeringsmodalen."
      >
        <div className="card" style={{ padding: 0 }}>
          <div className={styles.tableToolbar}>
            <span style={{ fontSize: '0.8rem', color: 'var(--c-muted)' }}>
              {users !== null ? `${users.length} brukere` : ''}
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

      {/* ── Roles + Categories ────────────────────────────── */}
      <Section
        title="Roller og kategorier"
        description="Legg til nye roller som kan tildeles brukere. Kategorier vises som de er registrert i systemet."
      >
        <div className={styles.panelGrid}>
          <RollerPanel roles={roles} setRoles={setRoles} loading={rolesLoading} />
          <KategorierPanel categories={categories} loading={rolesLoading} />
        </div>
      </Section>

      {showRegister && (
        <RegisterModal
          roles={roles}
          onClose={() => setShowRegister(false)}
          onCreated={u => { setUsers(prev => [...prev, normalizeUser(u)]); setShowRegister(false); }}
        />
      )}

      {editUser && (
        <EditUserModal
          user={editUser}
          allRoles={roles}
          onClose={() => setEditUser(null)}
          onSaved={updated => {
            const normalized = normalizeUser(updated);
            setUsers(prev => prev.map(u => u.id === normalized.id ? normalized : u));
            setEditUser(null);
          }}
        />
      )}
    </div>
  );
}

// Normalize role objects from backend (handles fields like Rolle_ID / Navn)
function normalizeRole(raw) {
  if (!raw) return raw;
  const id = raw.Rolle_ID ?? raw.rolleId ?? raw.id ?? raw.RolleId ?? raw.RolleId;
  const navn = raw.Navn ?? raw.navn ?? raw.name ?? raw.Name;
  const out = { id, navn };
  if (raw.rolleId) out.rolleId = raw.rolleId;
  if (raw.Rolle_ID) out.rolleId = raw.Rolle_ID;
  return out;
}

function normalizeUser(raw) {
  if (!raw) return raw;
  return {
    id: raw.Bruker_ID ?? raw.brukerId ?? raw.id,
    brukernavn: raw.Username ?? raw.brukernavn ?? raw.username,
    epost: raw.Email ?? raw.epost ?? raw.email ?? '',
    displayName: raw.DisplayName ?? raw.displayName ?? raw.display_name ?? '',
    fullName: raw.FullName ?? raw.fullName ?? raw.full_name ?? '',
    roller: Array.isArray(raw.roller) ? raw.roller.map(normalizeRole) : raw.roller,
  };
}