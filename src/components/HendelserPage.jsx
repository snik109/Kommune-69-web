import { useState, useEffect } from 'react';
import { hendelser, lookup } from '../services/api';
import styles from '../styles/HendelserPage.module.css';

const priorityBadge = (p) => {
  const map = { 'meget høy': 'badge-danger', høy: 'badge-danger', medium: 'badge-warn', lav: 'badge-success' };
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
                {Array.isArray(statuses) && statuses.map(s => (
                  <option key={s.Status_ID} value={s.Status_ID}>{s.Navn}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Prioritering</label>
              <select className="select" value={form.prioriteringId} onChange={e => set('prioriteringId', e.target.value)}>
                <option value="">Velg prioritering</option>
                {Array.isArray(priorities) && priorities.map(p => (
                  <option key={p.Prioritering_ID} value={p.Prioritering_ID}>{p.Navn}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Avbryt</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>Opprett</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function HendelserPage({ onSelect }) {
  const [items, setItems] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');

  const fetchAll = async () => {
    try {
      const [h, s, p] = await Promise.all([
        hendelser.getAll(),
        lookup.getStatuses(),
        lookup.getPriorities(),
      ]);
      setItems(Array.isArray(h) ? h : []);
      // Henter ut arrayene fra objektene
      setStatuses(s?.statuser || []);
      setPriorities(p?.prioriteringer || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = items.filter(h =>
    (h.Tittel || h.tittel || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>Hendelser</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Ny hendelse</button>
      </div>

      <div className={styles.toolbar}>
        <input
          className="input"
          placeholder="Søk etter hendelse…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? <div className="loading-center"><span className="spinner" /></div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tittel</th>
                  <th>Status</th>
                  <th>Prioritering</th>
                  <th>Ansvarlig</th>
                  <th>Opprettet</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(h => (
                  <tr key={h.Hendelse_ID || h.id} onClick={() => onSelect?.(h.Hendelse_ID || h.id)} style={{ cursor: 'pointer' }}>
                    <td><strong>{h.Tittel || h.tittel}</strong></td>
                    <td><span className={`badge ${statusBadge(h.StatusNavn)}`}>{h.StatusNavn || '—'}</span></td>
                    <td><span className={`badge ${priorityBadge(h.PrioriteringNavn)}`}>{h.PrioriteringNavn || '—'}</span></td>
                    <td>{h.AnsvarligNavn || 'Ikke tildelt'}</td>
                    <td>{h.Tidspunkt_Opprettet ? new Date(h.Tidspunkt_Opprettet).toLocaleDateString('nb-NO') : '—'}</td>
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
          onCreated={() => { fetchAll(); setShowCreate(false); }}
        />
      )}
    </div>
  );
}