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

  const currentUser = JSON.parse(localStorage.getItem('user'));
  const innloggetBrukerId = currentUser?.Bruker_ID || currentUser?.id;

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    Promise.all([
      kommentarer.getByHendelse(hendelse.id).catch(() => []),
      tiltak.getByHendelse(hendelse.id).catch(() => [])
    ]).then(([commentData, actionData]) => {
      if (isMounted) {
        setComments(Array.isArray(commentData) ? commentData : []);
        setActions(Array.isArray(actionData) ? actionData : []);
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
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

  async function handleResponsibleChange(valgtBrukerId) {
    setSaving(true);
    try {
      // Sender { ansvarligId } som backend forventer
      await hendelser.updateResponsible(hendelse.id, valgtBrukerId);
      onUpdated();
    } catch (err) {
      alert("Kunne ikke endre ansvarlig: " + err.message);
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
        <div className={styles.detailGrid} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className={styles.detailSection}>
            <label>Status</label>
            <select className="select" value={hendelse.status} onChange={e => handleStatusChange(e.target.value)} disabled={saving}>
              {statuses.map(s => <option key={s.Status_ID} value={s.Navn}>{s.Navn}</option>)}
            </select>
          </div>
          <div className={styles.detailSection}>
            <label>Ansvarlig</label>
            <select 
              className="select" 
              value={hendelse.ansvarligId || ''} 
              onChange={e => handleResponsibleChange(e.target.value)} 
              disabled={saving}
            >
              <option value="">-- Velg ansvarlig --</option>
              {users.map(u => {
                // Sjekker både Bruker_ID og id siden backenden din returnerer Bruker_ID
                const uid = u.Bruker_ID ?? u.id;
                return (
                  <option key={uid} value={uid}>
                    {u.DisplayName || u.brukernavn || u.username}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        {/* ... Resten av koden (tiltak/kommentarer) ... */}
      </div>
    </div>
  );
}

export default function ManagementPage({ initialId, onClearInitial }) {
  const [hendelserList, setHendelserList] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHendelseId, setSelectedHendelseId] = useState(initialId || null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [h, s, u] = await Promise.all([
        hendelser.getAll(),
        lookup.getStatuses(),
        brukere.getAll()
      ]);
      const normalized = Array.isArray(h) ? h.map(normalizeHendelse) : [];
      
      // Sortering
      const order = { 'åpen': 1, 'under behandling': 2, 'løst': 3, 'lukket': 4 };
      const sorted = normalized.sort((a, b) => {
        const aVal = order[a.status.toLowerCase()] || 99;
        const bVal = order[b.status.toLowerCase()] || 99;
        if (aVal !== bVal) return aVal - bVal;
        return (b.prioriteringId || 0) - (a.prioriteringId || 0);
      });

      setHendelserList(sorted);
      setStatuses(s?.statuser || []);
      setUsers(Array.isArray(u) ? u : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []); // Viktig: Tom array her stopper API-spamming

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedHendelse = hendelserList.find(h => h.id === selectedHendelseId);
  const filtered = hendelserList.filter(h => h.tittel.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading && !selectedHendelse) return <div className="loading-center"><span className="spinner" /></div>;

  return (
    <div className={`${styles.management} ${selectedHendelse ? styles.withDetail : ''}`}>
      <div className={styles.listPanel}>
        <h1>Hendelsestyring</h1>
        <input 
          className="input" 
          placeholder="Søk..." 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
          style={{marginBottom: '1rem', width: '300px'}}
        />
        <div className={styles.hendelserGrid}>
          {filtered.map(h => (
            <div 
              key={h.id} 
              className={`card ${styles.hendelseCard} ${selectedHendelseId === h.id ? styles.activeCard : ''}`}
              onClick={() => setSelectedHendelseId(h.id)}
            >
              <div className={styles.hendelseHeader}>
                <h3>{h.tittel}</h3>
                <span className="badge badge-neutral">{h.status}</span>
              </div>
              <small>Ansvarlig: {h.ansvarlig || 'Ingen'}</small>
            </div>
          ))}
        </div>
      </div>

      {selectedHendelse && (
        <DetailPanel
          hendelse={selectedHendelse}
          statuses={statuses}
          users={users}
          onClose={() => { setSelectedHendelseId(null); onClearInitial?.(); }}
          onUpdated={fetchData}
        />
      )}
    </div>
  );
}