import { useState, useEffect, useCallback } from 'react';
import { hendelser, kommentarer, lookup } from '../services/api';
import styles from '../styles/ManagementPage.module.css';

// Mapper SQL-resultater til frontend-format
function normalizeHendelse(raw) {
  if (!raw) return raw;
  return {
    id: raw.Hendelse_ID ?? raw.id,
    tittel: raw.Tittel ?? raw.tittel ?? '',
    beskrivelse: raw.Beskrivelse ?? raw.beskrivelse ?? '',
    status: raw.StatusNavn ?? raw.status ?? '',
    statusId: raw.Status_ID ?? raw.statusId,
    prioritering: raw.PrioriteringNavn ?? raw.prioritering ?? '',
    ansvarlig: raw.AnsvarligNavn ?? raw.ansvarlig ?? '',
    tidspunkt_opprettet: raw.Tidspunkt_Opprettet ?? raw.tidspunkt_opprettet ?? new Date().toISOString(),
  };
}

function DetailPanel({ hendelse, statuses = [], onClose, onUpdated }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [saving, setSaving] = useState(false);

  // Henter data fra localStorage basert på formatet ditt
  const userJson = localStorage.getItem('user');
  const currentUser = userJson ? JSON.parse(userJson) : null;
  const brukerId = currentUser?.Bruker_ID;

  useEffect(() => {
    setLoadingComments(true);
    kommentarer.getByHendelse(hendelse.id)
      .then(data => setComments(Array.isArray(data) ? data : []))
      .catch(() => setComments([]))
      .finally(() => setLoadingComments(false));
  }, [hendelse.id]);

  async function handleStatusChange(newStatusNavn) {
    const statusObj = (statuses || []).find(s => s.Navn === newStatusNavn);
    if (!statusObj) return;

    setSaving(true);
    try {
      // SENDER: hendelseId, statusId
      await hendelser.updateStatus(hendelse.id, statusObj.Status_ID);
      onUpdated?.(); 
    } catch (err) {
      alert("Feil ved statusoppdatering: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddComment() {
    if (!newComment.trim() || !brukerId) return;
    
    setSaving(true);
    try {
      // SENDER: hendelseId, brukerId, tekst
      await kommentarer.create(hendelse.id, brukerId, newComment);
      
      const updated = await kommentarer.getByHendelse(hendelse.id);
      setComments(Array.isArray(updated) ? updated : []);
      setNewComment('');
    } catch (err) {
      alert("Kunne ikke lagre kommentar: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.detailPanel}>
      <div className={styles.detailHeader}>
        <h2>Behandle hendelse</h2>
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
          <div className={styles.descBox}>{hendelse.beskrivelse}</div>
        </div>

        <hr className="divider" />

        <div className={styles.detailSection}>
          <h3>Kommentarlogg</h3>
          <div className={styles.commentsList}>
            {loadingComments ? (
              <span>Laster...</span>
            ) : comments.map(c => (
              <div key={c.id || c.Kommentar_ID} className={styles.comment}>
                <div className={styles.commentMeta}>
                  <strong>{c.DisplayName || c.brukernavn || 'Ukjent'}</strong>
                  <span>{new Date(c.Tidspunkt || c.tidspunkt).toLocaleString('nb-NO')}</span>
                </div>
                <p>{c.tekst || c.Innhold}</p>
              </div>
            ))}
          </div>
          
          <div className={styles.commentInputWrap}>
            <textarea 
              className="textarea" 
              value={newComment} 
              onChange={e => setNewComment(e.target.value)} 
              placeholder="Skriv en oppdatering..."
            />
            <button 
              className="btn btn-primary" 
              onClick={handleAddComment} 
              disabled={saving || !newComment.trim()}
            >
              {saving ? 'Lagrer...' : 'Send'}
            </button>
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

  // Sjekker rolle fra formatet {"roles": ["admin"]}
  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;
  const userRoles = Array.isArray(user?.roles) ? user.roles : [];
  const canManage = userRoles.includes('admin') || userRoles.includes('management');

  const fetchData = useCallback(async () => {
    try {
      const [h, s] = await Promise.all([
        hendelser.getAll(),
        lookup.getStatuses(),
      ]);
      const normalized = Array.isArray(h) ? h.map(normalizeHendelse) : [];
      setHendelserList(normalized);
      setStatuses(s?.statuser || []);

      if (initialId && canManage) {
        const found = normalized.find(item => item.id === initialId);
        if (found) setSelectedHendelse(found);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [initialId, canManage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleClose = () => {
    setSelectedHendelse(null);
    onClearInitial?.();
  };

  const filtered = hendelserList.filter(h =>
    h.tittel.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.management}>
      <div className={styles.listPanel}>
        <div className="page-header"><h1>Hendelsestyring</h1></div>
        <input
          className="input"
          placeholder="Søk i titler..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ marginBottom: '1.5rem' }}
        />
        
        {!canManage && (
          <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
            Du har kun lesetilgang. Logg inn som admin/management for å behandle saker.
          </div>
        )}

        <div className={styles.hendelserGrid}>
          {filtered.map(h => (
            <div 
              key={h.id} 
              className={`card ${styles.hendelseCard} 
                ${selectedHendelse?.id === h.id ? styles.activeCard : ''}`}
              style={{ 
                cursor: canManage ? 'pointer' : 'not-allowed',
                opacity: canManage ? 1 : 0.6 
              }}
              onClick={() => {
                if (canManage) {
                  setSelectedHendelse(h);
                }
              }}
            >
              <div className={styles.hendelseHeader}>
                <h3>{h.tittel}</h3>
                <span className="badge badge-neutral">{h.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedHendelse && (
        <DetailPanel
          hendelse={selectedHendelse}
          statuses={statuses}
          onClose={handleClose}
          onUpdated={() => {
            fetchData().then(() => {
               hendelser.getAll().then(res => {
                const found = res.find(item => (item.Hendelse_ID || item.id) === selectedHendelse.id);
                if (found) setSelectedHendelse(normalizeHendelse(found));
              });
            });
          }}
        />
      )}
    </div>
  );
}