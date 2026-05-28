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

function DetailPanel({ hendelse, statuses, priorities, users, onClose, onUpdated }) {
  const [comments, setComments] = useState([]);
  const [actions, setActions] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [newAction, setNewAction] = useState('');
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState(hendelse);

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

    // Fetch full hendelse details (may include full Beskrivelse)
    hendelser.getById(hendelse.id)
      .then(d => { if (isMounted && d) setDetail(normalizeHendelse(d)); })
      .catch(() => { /* ignore */ });

    return () => { isMounted = false; };
  }, [hendelse.id]);

  const handleStatusChange = async (val) => {
    const obj = statuses.find(s => s.Navn === val);
    if (!obj) return;
    setSaving(true);
    try {
      await hendelser.updateStatus(hendelse.id, obj.Status_ID);
      await onUpdated();
      try {
        const updated = await hendelser.getById(hendelse.id);
        if (updated) setDetail(normalizeHendelse(updated));
      } catch (_) { /* ignore */ }
    } catch (err) { alert("Statusfeil: " + err.message); }
    finally { setSaving(false); }
  };

  const handlePriorityChange = async (val) => {
    setSaving(true);
    try {
      const pId = Number(val);
      await hendelser.updatePriority(hendelse.id, pId);
      await onUpdated();
      try {
        const updated = await hendelser.getById(hendelse.id);
        if (updated) setDetail(normalizeHendelse(updated));
      } catch (_) { /* ignore */ }
    } catch (err) { alert("Prioriteringsfeil: " + err.message); }
    finally { setSaving(false); }
  };

  const handleResponsibleChange = async (val) => {
    setSaving(true);
    try {
      const bId = val === "" ? null : Number(val);
      await hendelser.updateResponsible(hendelse.id, bId);
      await onUpdated();
      try {
        const updated = await hendelser.getById(hendelse.id);
        if (updated) setDetail(normalizeHendelse(updated));
      } catch (_) { /* ignore */ }
    } catch (err) { alert("Ansvarlig-feil: " + err.message); }
    finally { setSaving(false); }
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
    } catch (err) { alert("Tiltaksfeil: " + err.message); }
    finally { setSaving(false); }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !innloggetBrukerId) return;
    setSaving(true);
    try {
      await kommentarer.create(hendelse.id, innloggetBrukerId, newComment);
      const res = await kommentarer.getByHendelse(hendelse.id);
      setComments(res);
      setNewComment('');
    } catch (err) { alert("Kommentarfeil: " + err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className={styles.detailPanel}>
      <div className={styles.detailHeader}>
        <div>
          <h2>Behandle hendelse</h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'gray' }}>{detail?.tittel || hendelse.tittel}</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
      </div>

      <div className={styles.detailContent}>
        <div className={styles.detailSection}>
          <label>Beskrivelse</label>
          <p style={{ color: 'var(--c-text-2)' }}>{detail?.beskrivelse || hendelse.beskrivelse || 'Ingen beskrivelse'}</p>
        </div>

        <div className={styles.detailGrid} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>STATUS</label>
            <select 
              className="select" 
              value={detail?.status || hendelse.status || ""} 
              onChange={e => handleStatusChange(e.target.value)} 
              disabled={saving}
            >
              {statuses.map(s => <option key={s.Status_ID} value={s.Navn}>{s.Navn}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>PRIORITET</label>
            <select 
              className="select" 
              value={detail?.prioriteringId ? String(detail.prioriteringId) : (hendelse.prioriteringId ? String(hendelse.prioriteringId) : "")} 
              onChange={e => handlePriorityChange(e.target.value)} 
              disabled={saving}
            >
              {priorities.map(p => (
                <option key={p.Prioritering_ID} value={String(p.Prioritering_ID)}>
                  {p.Navn}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>ANSVARLIG</label>
            <select 
              className="select" 
              value={detail?.ansvarligId ? String(detail.ansvarligId) : (hendelse.ansvarligId ? String(hendelse.ansvarligId) : "")} 
              onChange={e => handleResponsibleChange(e.target.value)} 
              disabled={saving}
            >
              <option value="">-- Ingen --</option>
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
            <h3>Utførte Tiltak</h3>
            <div className={styles.actionsList}>
              {actions.map(a => (
                <div key={a.Tiltak_ID} className={styles.actionItem} style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', marginBottom: '5px' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>{a.Beskrivelse || a.beskrivelse || a.Beskrivelse}</p>
                  <small>{a.UtførtAvNavn || a.UtfortAvNavn} • {new Date(a.Tidspunkt).toLocaleDateString()}</small>
                </div>
              ))}
            </div>
          <form onSubmit={handleAddAction} style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
            <input className="input" placeholder="Nytt tiltak..." value={newAction} onChange={e => setNewAction(e.target.value)} />
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>Legg til</button>
          </form>
        </div>

        <div className={styles.detailSection} style={{ marginTop: '1.5rem' }}>
          <h3>Kommentarlogg</h3>
          <div className={styles.commentsList} style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '10px' }}>
            {comments.map(c => (
              <div key={c.Kommentar_ID} style={{ borderBottom: '1px solid #eee', padding: '5px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <strong>{c.DisplayName}</strong>
                  <span>{new Date(c.Tidspunkt).toLocaleString()}</span>
                </div>
                <p style={{ margin: '5px 0 0', fontSize: '0.85rem' }}>{c.Tekst}</p>
              </div>
            ))}
          </div>
          <form onSubmit={handleAddComment} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <textarea className="textarea" placeholder="Skriv kommentar..." value={newComment} onChange={e => setNewComment(e.target.value)} rows="2" />
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !newComment.trim()}>Send kommentar</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ManagementPage({ initialId, onClearInitial }) {
  const [hendelserList, setHendelserList] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(initialId || null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [h, s, p, u] = await Promise.all([
        hendelser.getAll(),
        lookup.getStatuses(),
        lookup.getPriorities(),
        brukere.getAll()
      ]);

      const rawHendelser = Array.isArray(h)
        ? h
        : h?.hendelser || h?.data || h?.items || [];
      const normalized = Array.isArray(rawHendelser)
        ? rawHendelser.map(normalizeHendelse)
        : [];

      const defaultPriorityOrder = {
        'meget høy': 5,
        'høy': 4,
        'middels': 3,
        'lav': 2,
        'meget lav': 1,
      };
      const priorityOrder = Array.isArray(p)
        ? p.reduce((map, item, index) => {
          const name = (item.Navn || item.navn || '').toString().toLowerCase().trim();
          map[name] = defaultPriorityOrder[name] ?? (p.length - index);
          return map;
        }, {})
        : defaultPriorityOrder;
      const statusOrder = {
        'åpen': 1,
        'under behandling': 2,
        'løst': 3,
        'lukket': 4,
      };
      const isOpenStatus = status => ['åpen', 'under behandling'].includes(status);
      const isClosedStatus = status => ['løst', 'lukket'].includes(status);

      normalized.sort((a, b) => {
        const aStatusKey = (a.status || '').toLowerCase();
        const bStatusKey = (b.status || '').toLowerCase();
        const aPriority = priorityOrder[(a.prioritering || '').toLowerCase()] ?? Number(a.prioriteringId ?? 0);
        const bPriority = priorityOrder[(b.prioritering || '').toLowerCase()] ?? Number(b.prioriteringId ?? 0);
        const aStatusRank = statusOrder[aStatusKey] ?? 50;
        const bStatusRank = statusOrder[bStatusKey] ?? 50;

        const aOpen = isOpenStatus(aStatusKey);
        const bOpen = isOpenStatus(bStatusKey);
        const aClosed = isClosedStatus(aStatusKey);
        const bClosed = isClosedStatus(bStatusKey);

        if (aOpen && bOpen) {
          if (aPriority !== bPriority) return bPriority - aPriority;
          return aStatusRank - bStatusRank;
        }

        if (aClosed && bClosed) {
          if (aStatusRank !== bStatusRank) return aStatusRank - bStatusRank;
          return bPriority - aPriority;
        }

        if (aOpen && !bOpen) return -1;
        if (!aOpen && bOpen) return 1;

        if (aClosed && !bClosed) return 1;
        if (!aClosed && bClosed) return -1;

        if (aPriority !== bPriority) return bPriority - aPriority;
        return aStatusRank - bStatusRank;
      });

      setHendelserList(normalized);
      setStatuses(Array.isArray(s) ? s : (s?.statuser || s?.statuses || []));
      setPriorities(Array.isArray(p) ? p : (p?.prioriteringer || p?.priorities || []));
      setUsers(Array.isArray(u) ? u : (u?.brukere || u?.users || []));
    } catch (err) {
      console.error('Data-load feilet:', err);
      setHendelserList([]);
      setStatuses([]);
      setPriorities([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // VIKTIG: Finn selectedHendelse direkte hver gang listen endres
  const selectedHendelse = hendelserList.find(h => h.id === selectedId);

  const filtered = useMemo(() => 
    (Array.isArray(hendelserList) ? hendelserList : []).filter(h =>
      (h.tittel || '').toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [hendelserList, searchTerm]
  );

  if (loading && !hendelserList.length) return <div className="loading-center">Laster system...</div>;

  return (
    <div className={`${styles.management} ${selectedHendelse ? styles.withDetail : ''}`}>
      <div className={styles.listPanel}>
        <div className="page-header">
          <h1>Hendelsestyring</h1>
        </div>

        <input className="input" placeholder="Søk i titler..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ marginBottom: '1rem', maxWidth: '300px' }} />
        
        <div className={styles.hendelserGrid}>
          {filtered.map(h => (
            <div 
              key={h.id} 
              className={`${styles.hendelseCard} ${selectedId === h.id ? styles.activeCard : ''}`}
              onClick={() => setSelectedId(h.id)}
              style={{ cursor: 'pointer', padding: '1rem', border: '1px solid #eee', borderRadius: '8px', marginBottom: '0.5rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{h.tittel}</strong>
                <span className="badge">{h.status}</span>
              </div>
              <div style={{ fontSize: '0.8rem', marginTop: '5px', color: '#666' }}>
                Prio: <strong>{h.prioritering}</strong> | Ansvarlig: {h.ansvarlig || 'Ingen'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedHendelse && (
        <DetailPanel
          hendelse={selectedHendelse}
          statuses={statuses}
          priorities={priorities}
          users={users}
          onClose={() => { setSelectedId(null); onClearInitial?.(); }}
          onUpdated={loadData}
        />
      )}
    </div>
  );
}