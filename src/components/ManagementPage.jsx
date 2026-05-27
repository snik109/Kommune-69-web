import { useState, useEffect, useCallback, useMemo } from 'react';
import { hendelser, kommentarer, lookup, tiltak, brukere } from '../services/api';
import styles from '../styles/ManagementPage.module.css';

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

  const handleStatusChange = async (e) => {
    const val = e.target.value;
    const obj = statuses.find(s => s.Navn === val);
    if (!obj) return;
    setSaving(true);
    try {
      await hendelser.updateStatus(hendelse.id, obj.Status_ID);
      await onUpdated();
    } catch (err) {
      alert("Feil ved status: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResponsibleChange = async (e) => {
    const val = e.target.value;
    setSaving(true);
    try {
      const newId = val === "" ? null : Number(val);
      
      // Vi kaller API-et
      await hendelser.updateResponsible(hendelse.id, newId);
      
      // Vi trigger en refresh av hovedlisten i ManagementPage
      await onUpdated();
    } catch (err) {
      alert("Kunne ikke tildele ansvarlig: " + err.message);
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
      alert("Feil ved tiltak: " + err.message);
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
        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); onClose(); }}>✕</button>
      </div>

      <div className={styles.detailContent}>
        <div className={styles.detailGrid} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>STATUS</label>
            <select 
              className="select" 
              value={hendelse.status} 
              onChange={handleStatusChange} 
              disabled={saving}
              style={{ width: '100%' }}
            >
              {statuses.map(s => <option key={s.Status_ID} value={s.Navn}>{s.Navn}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>ANSVARLIG</label>
            <select 
              className="select" 
              value={hendelse.ansvarligId ? String(hendelse.ansvarligId) : ""} 
              onChange={handleResponsibleChange} 
              disabled={saving}
              style={{ width: '100%' }}
            >
              <option value="">-- Velg ansvarlig --</option>
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
            {actions.map(a => (
              <div key={a.Tiltak_ID} className={styles.actionItem} style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', marginBottom: '5px' }}>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>{a.Beskrivelse}</p>
                <small>{a.UtførtAvNavn}</small>
              </div>
            ))}
          </div>
          <form onSubmit={handleAddAction} style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
            <input 
              className="input" 
              placeholder="Beskriv nytt tiltak..." 
              value={newAction} 
              onChange={e => setNewAction(e.target.value)} 
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !newAction.trim()}>Legg til</button>
          </form>
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

  const loadData = useCallback(async () => {
    try {
      const [h, s, u] = await Promise.all([
        hendelser.getAll(),
        lookup.getStatuses(),
        brukere.getAll()
      ]);
      
      const normalized = Array.isArray(h) ? h.map(normalizeHendelse) : [];
      
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
      console.error("Feil ved henting av data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedHendelse = useMemo(() => 
    hendelserList.find(h => h.id === selectedId) || null,
    [hendelserList, selectedId]
  );

  const filtered = useMemo(() => 
    hendelserList.filter(h => h.tittel.toLowerCase().includes(searchTerm.toLowerCase())),
    [hendelserList, searchTerm]
  );

  const handleCardClick = (id) => {
    setSelectedId(id);
  };

  if (loading && !hendelserList.length) return <div className="loading-center">Laster hendelser...</div>;

  return (
    <div className={`${styles.management} ${selectedHendelse ? styles.withDetail : ''}`}>
      <div className={styles.listPanel}>
        <h1>Hendelsestyring</h1>
        <input 
          className="input" 
          placeholder="Søk..." 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
          style={{ marginBottom: '1.5rem', maxWidth: '300px' }}
        />
        
        <div className={styles.hendelserGrid}>
          {filtered.map(h => (
            <div 
              key={h.id} 
              className={`${styles.hendelseCard} ${selectedId === h.id ? styles.activeCard : ''}`}
              onClick={() => handleCardClick(h.id)}
              style={{ cursor: 'pointer', padding: '1rem', border: '1px solid #eee', borderRadius: '8px', marginBottom: '0.5rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{h.tittel}</strong>
                <span className="badge">{h.status}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>
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
          onUpdated={loadData}
        />
      )}
    </div>
  );
}