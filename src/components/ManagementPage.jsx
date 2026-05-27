import { useState, useEffect, useCallback } from 'react';
import { hendelser, kommentarer, lookup, tiltak } from '../services/api';
import styles from '../styles/ManagementPage.module.css';

// Mapper SQL-resultater (PascalCase) til frontend (camelCase)
function normalizeHendelse(raw) {
  if (!raw) return raw;
  return {
    id: raw.Hendelse_ID ?? raw.id,
    tittel: raw.Tittel ?? raw.tittel ?? '',
    beskrivelse: raw.Beskrivelse ?? raw.beskrivelse ?? '',
    status: raw.StatusNavn ?? raw.status ?? '',
    statusId: raw.Status_ID ?? raw.statusId,
    prioritering: raw.PrioriteringNavn ?? raw.prioritering ?? '',
    prioriteringId: raw.Prioritering_ID ?? raw.prioriteringId,
    ansvarlig: raw.AnsvarligNavn ?? raw.ansvarlig ?? '',
    tidspunkt_opprettet: raw.Tidspunkt_Opprettet ?? raw.tidspunkt_opprettet ?? new Date().toISOString(),
  };
}

function DetailPanel({ hendelse, statuses = [], onClose, onUpdated }) {
  const [comments, setComments] = useState([]);
  const [actions, setActions] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [newAction, setNewAction] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const userJson = localStorage.getItem('user');
  const currentUser = userJson ? JSON.parse(userJson) : null;
  const brukerId = currentUser?.Bruker_ID;

  // Henter både kommentarer og tiltak når en hendelse velges
  useEffect(() => {
    setLoading(true);
    Promise.all([
      kommentarer.getByHendelse(hendelse.id).catch(() => []),
      tiltak.getByHendelse(hendelse.id).catch(() => [])
    ])
    .then(([commentData, actionData]) => {
      setComments(Array.isArray(commentData) ? commentData : []);
      setActions(Array.isArray(actionData) ? actionData : []);
    })
    .finally(() => setLoading(false));
  }, [hendelse.id]);

  async function handleStatusChange(newStatusNavn) {
    const statusObj = statuses.find(s => s.Navn === newStatusNavn);
    if (!statusObj) return;
    setSaving(true);
    try {
      await hendelser.updateStatus(hendelse.id, statusObj.Status_ID);
      onUpdated();
    } catch (err) {
      alert("Feil ved statusoppdatering: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddAction() {
    if (!newAction.trim()) return;
    setSaving(true);
    try {
      await tiltak.create(hendelse.id, newAction);
      const updated = await tiltak.getByHendelse(hendelse.id);
      setActions(Array.isArray(updated) ? updated : []);
      setNewAction('');
    } catch (err) {
      alert("Feil ved lagring av tiltak: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddComment() {
    if (!newComment.trim() || !brukerId) return;
    setSaving(true);
    try {
      await kommentarer.create(hendelse.id, brukerId, newComment);
      const updated = await kommentarer.getByHendelse(hendelse.id);
      setComments(Array.isArray(updated) ? updated : []);
      setNewComment('');
    } catch (err) {
      alert("Feil ved lagring av kommentar: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.detailPanel}>
      <div className={styles.detailHeader}>
        <div>
          <h2>Behandle hendelse</h2>
          <small>{hendelse.tittel}</small>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
      </div>

      <div className={styles.detailContent}>
        {/* Statusvelger */}
        <div className={styles.detailSection}>
          <label>Status</label>
          <select 
            className="select" 
            value={hendelse.status} 
            onChange={e => handleStatusChange(e.target.value)}
            disabled={saving}
          >
            {statuses.map(s => (
              <option key={s.Status_ID} value={s.Navn}>{s.Navn}</option>
            ))}
          </select>
        </div>

        {/* TILTAK SEKSJON */}
        <div className={styles.detailSection}>
          <h3>Utførte Tiltak</h3>
          <div className={styles.actionsList}>
            {loading ? <span>Laster tiltak...</span> : (
              actions.length === 0 ? <p className={styles.emptyMsg}>Ingen tiltak registrert enda.</p> :
              actions.map(a => (
                <div key={a.Tiltak_ID} className={styles.actionItem}>
                  <p>{a.Beskrivelse}</p>
                  <small>{a.UtførtAvNavn || 'System'} • {new Date(a.Tidspunkt).toLocaleString('nb-NO')}</small>
                </div>
              ))
            )}
          </div>
          <div className={styles.actionInputWrap}>
            <input 
              className="input" 
              placeholder="Beskriv nytt tiltak..." 
              value={newAction}
              onChange={e => setNewAction(e.target.value)}
            />
            <button 
              className="btn btn-primary btn-sm" 
              onClick={handleAddAction} 
              disabled={saving || !newAction.trim()}
            >
              Legg til
            </button>
          </div>
        </div>

        <hr className="divider" />

        {/* KOMMENTAR SEKSJON */}
        <div className={styles.detailSection}>
          <h3>Kommentarlogg</h3>
          <div className={styles.commentsList}>
            {comments.map(c => (
              <div key={c.Kommentar_ID} className={styles.comment}>
                <div className={styles.commentMeta}>
                  <strong>{c.DisplayName}</strong>
                  <span>{new Date(c.Tidspunkt).toLocaleString('nb-NO')}</span>
                </div>
                <p>{c.Tekst}</p>
              </div>
            ))}
          </div>
          <div className={styles.commentInputWrap}>
            <textarea 
              className="textarea" 
              value={newComment} 
              onChange={e => setNewComment(e.target.value)} 
              placeholder="Skriv en kommentar..."
            />
            <button className="btn btn-primary" onClick={handleAddComment} disabled={saving || !newComment.trim()}>
              Send
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

  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;
  const userRoles = Array.isArray(user?.roles) ? user.roles : [];
  const canManage = userRoles.includes('admin') || userRoles.includes('management');

  const fetchData = useCallback(async () => {
    try {
      const [h, s] = await Promise.all([hendelser.getAll(), lookup.getStatuses()]);
      const normalized = Array.isArray(h) ? h.map(normalizeHendelse) : [];
      
      // SORTERINGSLOGIKK:
      // 1. Prioritering (Høyest ID først, f.eks Kritisk > Lav)
      // 2. Status (Åpen og Under behandling først, Lukkede/Løste sist)
      const sorted = normalized.sort((a, b) => {
        const statusOrder = { 'åpen': 1, 'under behandling': 2, 'løst': 3, 'lukket': 4 };
        const aStatus = statusOrder[a.status.toLowerCase()] || 99;
        const bStatus = statusOrder[b.status.toLowerCase()] || 99;

        if (aStatus !== bStatus) return aStatus - bStatus;
        return (b.prioriteringId || 0) - (a.prioriteringId || 0);
      });

      setHendelserList(sorted);
      setStatuses(s?.statuser || []);

      if (initialId && canManage) {
        const found = sorted.find(item => item.id === initialId);
        if (found) setSelectedHendelse(found);
      }
    } catch (err) {
      console.error("Feil ved henting av data:", err);
    } finally {
      setLoading(false);
    }
  }, [initialId, canManage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = hendelserList.filter(h =>
    h.tittel.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`${styles.management} ${selectedHendelse ? styles.withDetail : ''}`}>
      <div className={styles.listPanel}>
        <div className="page-header">
          <h1>Hendelsestyring</h1>
        </div>

        <input
          className="input"
          placeholder="Søk i hendelser..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ marginBottom: '1.5rem' }}
        />
        
        <div className={styles.hendelserGrid}>
          {filtered.map(h => (
            <div 
              key={h.id} 
              className={`card ${styles.hendelseCard} ${selectedHendelse?.id === h.id ? styles.activeCard : ''}`}
              onClick={() => canManage && setSelectedHendelse(h)}
              style={{ cursor: canManage ? 'pointer' : 'default' }}
            >
              <div className={styles.hendelseHeader}>
                <h3>{h.tittel}</h3>
                <span className="badge badge-neutral">{h.status}</span>
              </div>
              <div className={styles.cardMeta}>
                <span className="badge badge-info">{h.prioritering}</span>
                <small>{h.ansvarlig || 'Ingen ansvarlig'}</small>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedHendelse && (
        <DetailPanel
          hendelse={selectedHendelse}
          statuses={statuses}
          onClose={() => { setSelectedHendelse(null); onClearInitial?.(); }}
          onUpdated={fetchData}
        />
      )}
    </div>
  );
}