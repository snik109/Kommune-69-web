import { useState, useEffect, useCallback } from 'react';
import { hendelser, kommentarer, lookup } from '../services/api';
import styles from '../styles/ManagementPage.module.css';

function normalizeHendelse(raw) {
  if (!raw) return raw;
  return {
    id: raw.Hendelse_ID ?? raw.id,
    tittel: raw.Tittel ?? raw.tittel ?? '',
    beskrivelse: raw.Beskrivelse ?? raw.beskrivelse ?? '',
    status: raw.StatusNavn ?? raw.status ?? '',
    prioritering: raw.PrioriteringNavn ?? raw.prioritering ?? '',
    ansvarlig: raw.AnsvarligNavn ?? raw.ansvarlig ?? '',
    tidspunkt_opprettet: raw.Tidspunkt_Opprettet ?? raw.tidspunkt_opprettet ?? new Date().toISOString(),
  };
}

function HendelseCard({ hendelse, onSelect, isActive }) {
  return (
    <div 
      className={`card ${styles.hendelseCard} ${isActive ? styles.activeCard : ''}`} 
      onClick={() => onSelect(hendelse)}
      style={isActive ? { borderColor: 'var(--c-primary)', backgroundColor: 'var(--bg-alt)' } : {}}
    >
      <div className={styles.hendelseHeader}>
        <h3>{hendelse.tittel}</h3>
        <span className="badge badge-neutral">{hendelse.status || '—'}</span>
      </div>
      <p style={{ color: 'var(--c-text-2)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
        {hendelse.beskrivelse ? (hendelse.beskrivelse.substring(0, 80) + '...') : 'Ingen beskrivelse'}
      </p>
    </div>
  );
}

function DetailPanel({ hendelse, statuses = [], onClose, onUpdated }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hendelse) return;
    setLoadingComments(true);
    kommentarer.getByHendelse(hendelse.id)
      .then(data => setComments(Array.isArray(data) ? data : []))
      .catch(() => setComments([]))
      .finally(() => setLoadingComments(false));
  }, [hendelse.id]);

  async function handleStatusChange(newStatusNavn) {
    setSaving(true);
    try {
      const statusObj = (statuses || []).find(s => s.Navn === newStatusNavn);
      await hendelser.updateStatus(hendelse.id, statusObj?.Status_ID || newStatusNavn);
      onUpdated?.(); 
    } catch (err) {
      alert("Feil: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddComment() {
    if (!newComment.trim()) return;
    setSaving(true);
    try {
      await kommentarer.create(hendelse.id, newComment);
      const updated = await kommentarer.getByHendelse(hendelse.id);
      setComments(Array.isArray(updated) ? updated : []);
      setNewComment('');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.detailPanel}>
      <div className={styles.detailHeader}>
        <h2>Detaljer</h2>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
      </div>

      <div className={styles.detailContent}>
        <div className={styles.detailSection}>
          <label>Status</label>
          <select 
            className="select" 
            value={hendelse.status} 
            onChange={e => handleStatusChange(e.target.value)}
            disabled={saving}
          >
            {(statuses || []).map(s => (
              <option key={s.Status_ID} value={s.Navn}>{s.Navn}</option>
            ))}
          </select>
        </div>

        <div className={styles.detailSection}>
          <label>Beskrivelse</label>
          <p className={styles.descBox}>{hendelse.beskrivelse || 'Ingen beskrivelse.'}</p>
        </div>

        <hr className="divider" />

        <div className={styles.detailSection}>
          <h3>Kommentarer</h3>
          <div className={styles.commentsList}>
            {loadingComments ? <span>Laster...</span> : comments.map(c => (
              <div key={c.id} className={styles.comment}>
                <div className={styles.commentMeta}>
                  <strong>{c.brukernavn || 'System'}</strong>
                  <span>{new Date(c.tidspunkt).toLocaleString('nb-NO')}</span>
                </div>
                <p>{c.tekst}</p>
              </div>
            ))}
          </div>
          <div className={styles.commentInputWrap}>
            <textarea 
              className="textarea" 
              value={newComment} 
              onChange={e => setNewComment(e.target.value)} 
              placeholder="Skriv kommentar..."
            />
            <button className="btn btn-primary" onClick={handleAddComment} disabled={saving}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ManagementPage({ initialId, onClearInitial }) {
  const [hendelserList, setHendelserList] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHendelse, setSelectedHendelse] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [h, s] = await Promise.all([
        hendelser.getAll(),
        lookup.getStatuses(),
      ]);
      const normalized = Array.isArray(h) ? h.map(normalizeHendelse) : [];
      setHendelserList(normalized);
      setStatuses(s?.statuser || []);

      // Åpne initialId hvis den finnes
      if (initialId) {
        const found = normalized.find(item => item.id === initialId);
        if (found) setSelectedHendelse(found);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [initialId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleClose = () => {
    setSelectedHendelse(null);
    onClearInitial?.(); // Nullstill ID-en i App.jsx slik at den ikke åpnes igjen neste gang
  };

  const filtered = hendelserList.filter(h =>
    h.tittel.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.management}>
      <div className={styles.listPanel}>
        <div className="page-header">
          <h1>Hendelsestyring</h1>
        </div>
        <input
          className="input"
          placeholder="Søk..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ marginBottom: '1rem' }}
        />
        {loading ? <span className="spinner" /> : (
          <div className={styles.hendelserGrid}>
            {filtered.map(h => (
              <HendelseCard
                key={h.id}
                hendelse={h}
                onSelect={setSelectedHendelse}
                isActive={selectedHendelse?.id === h.id}
              />
            ))}
          </div>
        )}
      </div>

      {selectedHendelse && (
        <DetailPanel
          hendelse={selectedHendelse}
          statuses={statuses}
          onClose={handleClose}
          onUpdated={fetchData}
        />
      )}
    </div>
  );
}