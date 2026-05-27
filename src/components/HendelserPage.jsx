import { useState, useEffect } from 'react';
import { hendelser, lookup } from '../services/api';
import styles from '../styles/HendelserPage.module.css';

const priorityBadge = (p) => {
  const map = { høy: 'badge-danger', medium: 'badge-warn', lav: 'badge-success' };
  return map[p?.toLowerCase()] || 'badge-neutral';
};

const statusBadge = (s) => {
  const map = { åpen: 'badge-info', 'under behandling': 'badge-warn', lukket: 'badge-neutral', løst: 'badge-success' };
  return map[s?.toLowerCase()] || 'badge-neutral';
};

function CreateModal({ onClose, onCreated, statuses = [], priorities = [] }) {
  const [form, setForm] = useState({ tittel: '', beskrivelse: '', statusId: '', prioriteringId: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const created = await hendelser.create(form);
      onCreated(created);
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
          <h2>Ny hendelse</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
        <form onSubmit={handleSubmit} className="stack">
          <div className="field">
            <label>Tittel</label>
            <input className="input" required value={form.tittel} onChange={e => set('tittel', e.target.value)} />
          </div>
          <div className="field">
            <label>Beskrivelse</label>
            <textarea className="textarea" value={form.beskrivelse} onChange={e => set('beskrivelse', e.target.value)} />
          </div>
          <div className="form-grid">
            <div className="field">
              <label>Status</label>
              <select className="select" value={form.statusId} onChange={e => set('statusId', e.target.value)}>
                <option value="">Velg status</option>
                {(statuses || []).map(s => <option key={s.id} value={s.id}>{s.navn}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Prioritering</label>
              <select className="select" value={form.prioriteringId} onChange={e => set('prioriteringId', e.target.value)}>
                <option value="">Velg prioritering</option>
                {(priorities || []).map(p => <option key={p.id} value={p.id}>{p.navn}</option>)}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Avbryt</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Opprett'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function HendelserPage({ onSelect }) {
  const [items, setItems]       = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch]     = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [h, s, p] = await Promise.all([
          hendelser.getAll(),
          lookup.getStatuses(),
          lookup.getPriorities(),
        ]);
        
        setItems(Array.isArray(h) ? h : []);
        // Accessing the nested arrays in the response objects
        setStatuses(s?.statuser || []);
        setPriorities(p?.prioriteringer || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = items.filter(h =>
    h.tittel?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete(id, e) {
    e.stopPropagation();
    if (!confirm('Slett denne hendelsen?')) return;
    try {
      await hendelser.delete(id);
      setItems(prev => prev.filter(h => h.id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Hendelser</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Ny hendelse</button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className={styles.toolbar}>
        <input
          className="input"
          style={{ maxWidth: 280 }}
          placeholder="Søk etter hendelse…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span className={styles.count}>{filtered.length} hendelse{filtered.length !== 1 ? 'r' : ''}</span>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="loading-center"><span className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty"><h3>Ingen hendelser</h3><p>Opprett en ny hendelse for å komme i gang.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tittel</th>
                  <th>Status</th>
                  <th>Prioritering</th>
                  <th>Ansvarlig</th>
                  <th>Opprettet</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(h => (
                  <tr key={h.id} className={styles.row} onClick={() => onSelect?.(h.id)} style={{ cursor: 'pointer' }}>
                    <td><span className={styles.tittel}>{h.tittel}</span></td>
                    <td><span className={`badge ${statusBadge(h.status)}`}>{h.status || '—'}</span></td>
                    <td><span className={`badge ${priorityBadge(h.prioritering)}`}>{h.prioritering || '—'}</span></td>
                    <td>{h.ansvarlig || <span style={{ color: 'var(--c-muted)' }}>Ikke tildelt</span>}</td>
                    <td style={{ color: 'var(--c-muted)', fontSize: '0.8rem' }}>
                      {h.opprettetTid ? new Date(h.opprettetTid).toLocaleDateString('nb-NO') : '—'}
                    </td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={e => handleDelete(h.id, e)}
                      >Slett</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateModal
          statuses={statuses}
          priorities={priorities}
          onClose={() => setShowCreate(false)}
          onCreated={h => { setItems(prev => [h, ...prev]); setShowCreate(false); }}
        />
      )}
    </div>
  );
}