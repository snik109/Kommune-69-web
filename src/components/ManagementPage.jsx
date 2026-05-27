import { useState, useEffect, useCallback } from 'react';
import { hendelser, kommentarer, lookup } from '../services/api';
import styles from '../styles/ManagementPage.module.css';

function normalizeHendelse(raw) {
  if (!raw) return null;
  return {
    id: raw.Hendelse_ID ?? raw.id,
    tittel: raw.Tittel ?? raw.tittel ?? '',
    beskrivelse: raw.Beskrivelse ?? raw.beskrivelse ?? '',
    status: raw.StatusNavn ?? raw.status ?? '',
    statusId: raw.Status_ID ?? raw.statusId,
  };
}

function DetailPanel({ hendelse, statuses = [], onClose, onUpdated }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving] = useState(false);

  // Henter brukerId fra lagret session
  const currentUser = JSON.parse(localStorage.getItem('user'));
  const brukerId = currentUser?.Bruker_ID || currentUser?.id;

  useEffect(() => {
    kommentarer.getByHendelse(hendelse.id).then(res => setComments(Array.isArray(res) ? res : []));
  }, [hendelse.id]);

  async function handleStatusChange(newStatusId) {
    if (!newStatusId) return;
    setSaving(true);
    try {
      // API FORVENTER PRESIST: hendelseId, statusId
      await hendelser.updateStatus(hendelse.id, parseInt(newStatusId));
      onUpdated();
    } catch (err) {
      alert("Feil ved statusoppdatering");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddComment() {
    if (!newComment.trim() || !brukerId) return;
    setSaving(true);
    try {
      // API FORVENTER PRESIST: hendelseId, brukerId, tekst
      await kommentarer.create(hendelse.id, brukerId, newComment);
      setNewComment('');
      const updated = await kommentarer.getByHendelse(hendelse.id);
      setComments(updated);
    } catch (err) {
      alert("Feil ved lagring av kommentar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.detailPanel}>
      <div className={styles.detailHeader}>
        <h3>{hendelse.tittel}</h3>
        <button onClick={onClose}>✕</button>
      </div>

      <div className={styles.detailContent}>
        <div className="field">
          <label>Status</label>
          <select 
            className="select" 
            value={hendelse.statusId || ''} 
            onChange={e => handleStatusChange(e.target.value)}
            disabled={saving}
          >
            {statuses.map(s => (
              <option key={s.Status_ID} value={s.Status_ID}>{s.Navn}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Beskrivelse</label>
          <p className={styles.descBox}>{hendelse.beskrivelse}</p>
        </div>

        <div className={styles.commentSection}>
          <h4>Kommentarer</h4>
          <div className={styles.commentsList}>
            {comments.map(c => (
              <div key={c.Kommentar_ID || c.id} className={styles.comment}>
                <strong>{c.DisplayName || c.brukernavn}: </strong>
                <span>{c.Tekst || c.tekst}</span>
              </div>
            ))}
          </div>
          <textarea 
            className="textarea"
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Skriv tekst..."
          />
          <button className="btn btn-primary" onClick={handleAddComment} disabled={saving}>Send</button>
        </div>
      </div>
    </div>
  );
}

export default function ManagementPage({ initialId, onClearInitial }) {
  const [items, setItems] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [h, s] = await Promise.all([hendelser.getAll(), lookup.getStatuses()]);
    const normalized = h.map(normalizeHendelse);
    setItems(normalized);
    setStatuses(s?.statuser || []);

    if (initialId) {
      const found = normalized.find(x => x.id === initialId);
      if (found) setSelected(found);
    }
  }, [initialId]);

  useEffect(() => { loadData().finally(() => setLoading(false)); }, [loadData]);

  const handleClose = () => {
    setSelected(null);
    onClearInitial?.();
  };

  return (
    <div className={styles.management}>
      <div className={styles.listPanel}>
        <h2>Hendelsestyring</h2>
        <div className={styles.hendelserGrid}>
          {items.map(h => (
            <div key={h.id} className={`card ${selected?.id === h.id ? styles.active : ''}`} onClick={() => setSelected(h)}>
              <strong>{h.tittel}</strong>
              <span className="badge">{h.status}</span>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <DetailPanel 
          hendelse={selected} 
          statuses={statuses} 
          onClose={handleClose} 
          onUpdated={loadData} 
        />
      )}
    </div>
  );
}