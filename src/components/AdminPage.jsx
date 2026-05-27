import { useState, useEffect } from 'react';
import { brukere, hendelser, lookup, roller } from '../services/api';
import styles from '../styles/AdminPage.module.css';

function StatCard({ label, value, sub }) {
  return (
    <div className={`card ${styles.statCard}`}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value ?? <span className="spinner" />}</span>
      {sub && <span className={styles.statSub}>{sub}</span>}
    </div>
  );
}

function Section({ title, action, children }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function EditUserModal({ user, allRoles, onClose, onSaved }) {
  const [form, setForm] = useState({ brukernavn: user.brukernavn || '', epost: user.epost || '' });
  const [userRoles, setUserRoles]   = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

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

export default function AdminPage() {
  const [users, setUsers]           = useState(null);
  const [allHendelser, setAllHendelser] = useState(null);
  const [roles, setRoles]           = useState([]);
  const [statuses, setStatuses]     = useState([]);
  const [error, setError]           = useState('');
  const [editUser, setEditUser]     = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    Promise.all([
      brukere.getAll(),
      hendelser.getAll(),
      lookup.getRoles(),
      lookup.getStatuses(),
    ])
      .then(([u, h, r, s]) => {
        setUsers(u);
        setAllHendelser(h);
        setRoles(r);
        setStatuses(s);
      })
      .catch(err => setError(err.message));
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

  async function handleDeleteHendelse(id) {
    try {
      await hendelser.delete(id);
      setAllHendelser(prev => prev.filter(h => h.id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  const openCount   = allHendelser?.filter(h => h.status?.toLowerCase() !== 'lukket' && h.status?.toLowerCase() !== 'løst').length;
  const resolvedCount = allHendelser?.filter(h => h.status?.toLowerCase() === 'løst').length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Admin</h1>
          <p style={{ color: 'var(--c-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Systemadministrasjon og oversikt
          </p>
        </div>
        <span className={styles.adminBadge}>Admin</span>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>{error}</div>}

      {/* Stats row */}
      <div className={styles.statsGrid}>
        <StatCard label="Totalt brukere"    value={users?.length}         sub="registrerte kontoer" />
        <StatCard label="Totalt hendelser"  value={allHendelser?.length}  sub="alle oppføringer" />
        <StatCard label="Åpne hendelser"    value={openCount}             sub="ikke avsluttet" />
        <StatCard label="Løste hendelser"   value={resolvedCount}         sub="markert løst" />
      </div>

      {/* Users section */}
      <Section title="Brukere" action={null}>
        <div className="card" style={{ padding: 0 }}>
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

      {/* Hendelser section */}
      <Section title="Alle hendelser">
        <div className="card" style={{ padding: 0 }}>
          {allHendelser === null ? (
            <div className="loading-center"><span className="spinner" /></div>
          ) : allHendelser.length === 0 ? (
            <div className="empty"><h3>Ingen hendelser</h3></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tittel</th>
                    <th>Status</th>
                    <th>Prioritering</th>
                    <th>Ansvarlig</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {allHendelser.map(h => (
                    <tr key={h.id}>
                      <td><strong>{h.tittel}</strong></td>
                      <td>
                        <span className="badge badge-neutral">{h.status || '—'}</span>
                      </td>
                      <td style={{ color: 'var(--c-text-2)' }}>{h.prioritering || '—'}</td>
                      <td style={{ color: 'var(--c-text-2)' }}>{h.ansvarlig || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteHendelse(h.id)}
                        >Slett</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Section>

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