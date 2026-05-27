import { useState, useEffect, useCallback, useMemo } from 'react';
import { hendelser, kommentarer, lookup, tiltak, brukere } from '../services/api';
import styles from '../styles/ManagementPage.module.css';

// Mapper database-felt til frontend-vennlige navn
function normalizeHendelse(raw) {
  if (!raw) return null;
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

function DetailPanel({ hendelse, statuses, users, onClose, onUpdated }) {
  const [comments, setComments] = useState([]);
  const [actions, setActions] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [newAction, setNewAction] = useState('');
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [saving, setSaving] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('user'));
  const innloggetBrukerId = currentUser?.Bruker_ID || currentUser?.id;

  // Last inn kommentarer og tiltak
  useEffect(() => {
    let isMounted = true;
    setLoadingDetails(true);
    
    Promise.all([
      kommentarer.getByHendelse(hendelse.id).catch(() => []),
      tiltak.getByHendelse(hendelse.id).catch(() => [])
    ]).then(([c, a]) => {
      if (isMounted) {
        setComments(Array.isArray(c) ? c : []);
        setActions(Array.isArray(a) ? a : []);
        setLoadingDetails(false);
      }
    });

    return () => { isMounted = false; };
  }, [hendelse.id]);

  const handleStatusChange = async (val) => {
    const obj = statuses.find(s => s.Navn === val);
    if (!obj) return;
    setSaving(true);
    try {
      await hendelser.updateStatus(hendelse.id, obj.Status_ID);
      await onUpdated(); 
    } catch (err) {
      alert("Status feil: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResponsibleChange = async (val) => {
    setSaving(true);
    try {
      // Konverterer til Number siden <select> returnerer string
      const newId = val === "" ? null : Number(val);
      await hendelser.updateResponsible(hendelse.id, newId);
      // Viktig: Vi venter på at forelderen har hentet ny data
      await onUpdated();
    } catch (err) {
      alert("Ansvarlig feil: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddAction = async (e) => {
    e.preventDefault();
    if (!newAction.trim()) return;
    setSaving(true);
    try {
      await tiltak.create(hendelse.id, newAction);
      const res = await tiltak.getByHendelse(hendelse.id);
      setActions(res);
      setNewAction('');
    } catch (err) {
      alert("Tiltak feil: " + err.message);
    } finally {
      setSaving(false);
    }
  };

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
        <div className={styles.detailGrid} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>STATUS</label>
            <select 
              className="select" 
              value={hendelse.status} 
              onChange={e => handleStatusChange(e.target.value)} 
              disabled={saving}
              style={{ width: '100%' }}
            >
              {statuses.map(s => <option key={s.Status_ID} value={s.Navn}>{s.Navn}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>ANSVARLIG</label>
            <select 
              className="select" 
              value={hendelse.ansvarligId ? String(hendelse.ansvarligId) : ""} 
              onChange={e => handleResponsibleChange(e.target.value)} 
              disabled={saving}
              style={{ width: '100%' }}
            >
              <option value="">-- Ingen tildelt --</option>
              {users.map(u => (
                <option key={u.Bruker_ID} value={String(u.Bruker_ID)}>
                  {u.DisplayName || u.brukernavn}
                </option>
              ))}
            </select>
          </div>
        </div>

        <hr className="divider" />

        <div className={styles.detailSection}>
          <h3>Tiltak</h3>
          <div className={styles.actionsList}>
            {loadingDetails ? <small>Laster tiltak...</small> : actions.map(a => (
              <div key={a.Tiltak_ID} className={styles.actionItem} style={{ background: '#f9f9f9', padding: '8px', marginBottom: '5px', borderRadius: '4px' }}>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>{a.Beskrivelse}</p>
                <small style={{ color: '#888' }}>{a.UtførtAvNavn}</small>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
            <input 
              className="input" 
              placeholder="Beskriv tiltak..." 
              value={newAction} 
              onChange={e => setNewAction(e.target.value)} 
            />
            <button className="btn btn-primary btn-sm" onClick={handleAddAction} disabled={saving}>Legg til</button>
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
  const [selectedId, setSelectedId] = useState(initialId || null);
  const [searchTerm, setSearchTerm] = useState('');

  const refreshData = useCallback(async () => {
    try {
      const [h, s, u] = await Promise.all([
        hendelser.getAll(),
        lookup.getStatuses(),
        brukere.getAll()
      ]);
      
      const normalized = Array.isArray(h) ? h.map(normalizeHendelse) : [];
      
      // Sortering
      const order = { 'åpen': 1, 'under behandling': 2, 'løst': 3, 'lukket': 4 };
      normalized.sort((a, b) => {
        const aVal = order[a.status.toLowerCase()] || 99;
        const bVal = order[b.status.toLowerCase()] || 99;
        return aVal !== bVal ? aVal - bVal : (b.prioriteringId - a.prioriteringId);
      });

      setHendelserList(normalized);
      setStatuses(s?.statuser || []);
      setUsers(Array.isArray(u) ? u : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const selectedHendelse = useMemo(() => 
    hendelserList.find(h => h.id === selectedId),
    [hendelserList, selectedId]
  );

  const filtered = useMemo(() => 
    hendelserList.filter(h => h.tittel.toLowerCase().includes(searchTerm.toLowerCase())),
    [hendelserList, searchTerm]
  );

  if (loading && !hendelserList.length) return <div className="loading-center">Laster systemet...</div>;

  return (
    <div className={`${styles.management} ${selectedHendelse ? styles.withDetail : ''}`}>
      <div className={styles.listPanel}>
        <h1>Hendelsestyring</h1>
        <input 
          className="input" 
          placeholder="Søk i hendelser..." 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
          style={{ marginBottom: '1rem', maxWidth: '350px' }}
        />
        
        <div className={styles.hendelserGrid}>
          {filtered.map(h => (
            <div 
              key={h.id} 
              className={`${styles.hendelseCard} ${selectedId === h.id ? styles.activeCard : ''}`}
              onClick={() => setSelectedId(h.id)}
              style={{ cursor: 'pointer', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '10px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{h.tittel}</strong>
                <span className="badge">{h.status}</span>
              </div>
              <div style={{ fontSize: '0.8rem', marginTop: '5px', color: '#666' }}>
                Ansvarlig: {h.ansvarlig || 'Ingen'}
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
          onClose={() => { setSelectedId(null); onClearInitial?.(); }}
          onUpdated={refreshData}
        />
      )}
    </div>
  );
}