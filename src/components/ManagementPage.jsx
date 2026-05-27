import { useState, useEffect, useCallback } from 'react';
import { hendelser, kommentarer, lookup, tiltak, brukere } from '../services/api';
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
    ansvarligId: raw.Ansvarlig_ID ?? raw.ansvarligId,
    tidspunkt_opprettet: raw.Tidspunkt_Opprettet ?? raw.tidspunkt_opprettet ?? new Date().toISOString(),
  };
}

function DetailPanel({ hendelse, statuses = [], users = [], onClose, onUpdated }) {
  const [comments, setComments] = useState([]);
  const [actions, setActions] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [newAction, setNewAction] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const userJson = localStorage.getItem('user');
  const currentUser = userJson ? JSON.parse(userJson) : null;
  const innloggetBrukerId = currentUser?.Bruker_ID || currentUser?.id;

  // Henter kommentarer og tiltak
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

  // Oppdaterer Status
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

  // Oppdaterer Ansvarlig (Bruker din spesifikke rute /hendelser/:id/ansvarlig)
  async function handleResponsibleChange(valgtBrukerId) {
    setSaving(true);
    try {
      // Sender { ansvarligId: valgtBrukerId } i body slik din backend krever
      await hendelser.updateResponsible(hendelse.id, valgtBrukerId);
      onUpdated();
    } catch (err) {
      alert("Kunne ikke endre ansvarlig: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  // Legge til tiltak
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

  // Legge til kommentar
  async function handleAddComment() {
    if (!newComment.trim() || !innloggetBrukerId) return;
    setSaving(true);
    try {
      await kommentarer.create(hendelse.id, innloggetBrukerId, newComment);
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
          <h2 style={{ fontSize: '1.1rem' }}>Behandle hendelse</h2>
          <small style={{ color: 'var(--c-muted)' }}>{hendelse.tittel}</small>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
      </div>

      <div className={styles.detailContent}>
        
        {/* Kontrollpanel for Status og Ansvarlig */}
        <div className={styles.detailGrid} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className={styles.detailSection}>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>Status</label>
            <select 
              className="select" 
              value={hendelse.status} 
              onChange={e => handleStatusChange(e.target.value)}
              disabled={saving}
              style={{ width: '100%' }}
            >
              {statuses.map(s => (
                <option key={s.Status_ID} value={s.Navn}>{s.Navn}</option>
              ))}
            </select>
          </div>

          <div className={styles.detailSection}>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>Ansvarlig</label>
            <select 
              className="select" 
              value={hendelse.ansvarligId || ''} 
              onChange={e => handleResponsibleChange(e.target.value)}
              disabled={saving}
              style={{ width: '100%' }}
            >
              <option value="">-- Velg ansvarlig --</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.displayName || u.brukernavn}
                </option>
              ))}
            </select>
          </div>
        </div>

        <hr className="divider" />

        {/* TILTAK SEKSJON */}
        <div className={styles.detailSection}>
          <h3 style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Utførte Tiltak</h3>
          <div className={styles.actionsList}>
            {actions.length === 0 ? <p className={styles.emptyMsg}>Ingen tiltak registrert.</p> :
              actions.map(a => (
                <div key={a.Tiltak_ID} className={styles.actionItem} style={{ marginBottom: '0.5rem', padding: '0.75rem', background: '#f8f9fa', borderRadius: '4px', borderLeft: '3px solid var(--c-primary)' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>{a.Beskrivelse}</p>
                  <small style={{ color: '#666', fontSize: '0.75rem' }}>{a.UtførtAvNavn} • {new Date(a.Tidspunkt).toLocaleString('nb-NO')}</small>
                </div>
              ))
            }
          </div>
          <div className={styles.actionInputWrap} style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <input 
              className="input" 
              placeholder="Beskriv nytt tiltak..." 
              value={newAction}
              onChange={e => setNewAction(e.target.value)}
            />
            <button className="btn btn-primary btn-sm" onClick={handleAddAction} disabled={saving || !newAction.trim()}>
              Legg til
            </button>
          </div>
        </div>

        <hr className="divider" />

        {/* KOMMENTAR SEKSJON */}
        <div className={styles.detailSection}>
          <h3 style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Kommentarlogg</h3>
          <div className={styles.commentsList} style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem' }}>
            {comments.map(c => (
              <div key={c.Kommentar_ID} style={{ marginBottom: '0.75rem', padding: '0.75rem', background: '#f1f3f5', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem', color: '#666' }}>
                  <strong>{c.DisplayName}</strong>
                  <span>{new Date(c.Tidspunkt).toLocaleString('nb-NO')}</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>{c.Tekst}</p>
              </div>
            ))}
          </div>
          <div className={styles.commentInputWrap} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <textarea 
              className="textarea" 
              value={newComment} 
              onChange={e => setNewComment(e.target.value)} 
              placeholder="Skriv en kommentar..."
              rows="2"
            />
            <button className="btn btn-primary" onClick={handleAddComment} disabled={saving || !newComment.trim()}>
              Send kommentar
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
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHendelse, setSelectedHendelse] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;
  const userRoles = Array.isArray(user?.roles) ? user.roles : [];
  const canManage = userRoles.includes('admin') || userRoles.includes('management');

  const fetchData = useCallback(async () => {
    try {
      const [h, s, u] = await Promise.all([
        hendelser.getAll(), 
        lookup.getStatuses(),
        brukere.getAll()
      ]);
      
      const normalized = Array.isArray(h) ? h.map(normalizeHendelse) : [];
      
      // Sortering: Åpen > Under behandling > Løst > Lukket
      const sorted = normalized.sort((a, b) => {
        const order = { 'åpen': 1, 'under behandling': 2, 'løst': 3, 'lukket': 4 };
        const aVal = order[a.status.toLowerCase()] || 99;
        const bVal = order[b.status.toLowerCase()] || 99;
        if (aVal !== bVal) return aVal - bVal;
        return (b.prioriteringId || 0) - (a.prioriteringId || 0);
      });

      setHendelserList(sorted);
      setStatuses(s?.statuser || []);
      setUsers(Array.isArray(u) ? u : []);

      // Oppdaterer den valgte hendelsen hvis den er åpen i panelet
      if (selectedHendelse) {
          const fresh = sorted.find(item => item.id === selectedHendelse.id);
          if (fresh) setSelectedHendelse(fresh);
      } else if (initialId) {
        const found = sorted.find(item => item.id === initialId);
        if (found) setSelectedHendelse(found);
      }
    } catch (err) {
      console.error("Management fetchData error:", err);
    } finally {
      setLoading(false);
    }
  }, [initialId, selectedHendelse]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = hendelserList.filter(h =>
    h.tittel.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && !selectedHendelse) return <div className="loading-center"><span className="spinner" /></div>;

  return (
    <div className={`${styles.management} ${selectedHendelse ? styles.withDetail : ''}`}>
      <div className={styles.listPanel}>
        <div className="page-header">
          <h1>Hendelsestyring</h1>
          {!canManage && <span className="badge badge-neutral">Kun lesetilgang</span>}
        </div>

        <input
          className="input"
          placeholder="Søk i titler..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ marginBottom: '1.5rem', width: '100%', maxWidth: '400px' }}
        />
        
        <div className={styles.hendelserGrid}>
          {filtered.map(h => (
            <div 
              key={h.id} 
              className={`card ${styles.hendelseCard} ${selectedHendelse?.id === h.id ? styles.activeCard : ''}`}
              onClick={() => canManage && setSelectedHendelse(h)}
              style={{ cursor: canManage ? 'pointer' : 'default', padding: '1rem', border: '1px solid var(--c-border)', borderRadius: '8px', marginBottom: '0.75rem' }}
            >
              <div className={styles.hendelseHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem' }}>{h.tittel}</h3>
                <span className="badge badge-neutral">{h.status}</span>
              </div>
              <div className={styles.cardMeta} style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span className="badge badge-info">{h.prioritering}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--c-muted)' }}>
                  Ansvarlig: <strong>{h.ansvarlig || 'Ingen'}</strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedHendelse && (
        <DetailPanel
          hendelse={selectedHendelse}
          statuses={statuses}
          users={users}
          onClose={() => { setSelectedHendelse(null); onClearInitial?.(); }}
          onUpdated={fetchData}
        />
      )}
    </div>
  );
}