import { useState, useEffect } from 'react';
import { hendelser, kommentarer, lookup } from '../services/api';
import styles from '../styles/ManagementPage.module.css';

// Mapper SQL-resultater (PascalCase) til frontend-objekter (camelCase)
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

function HendelseCard({ hendelse, onSelect }) {
  return (
    <div className={`card ${styles.hendelseCard}`} onClick={() => onSelect(hendelse)}>
      <div className={styles.hendelseHeader}>
        <h3>{hendelse.tittel}</h3>
        <span className="badge badge-neutral">{hendelse.status || '—'}</span>
      </div>
      <p style={{ color: 'var(--c-text-2)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
        {hendelse.beskrivelse ? (hendelse.beskrivelse.substring(0, 100) + '...') : 'Ingen beskrivelse'}
      </p>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--c-muted)' }}>
        <span>Prio: {hendelse.prioritering}</span>
        <span>Ansvarlig: {hendelse.ansvarlig || 'Ikke tildelt'}</span>
      </div>
    </div>
  );
}

function DetailPanel({ hendelse, statuses = [], onClose, onUpdated }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoadingComments(true);
    kommentarer.getByHendelse(hendelse.id)
      .then(data => setComments(Array.isArray(data) ? data : []))
      .catch(() => setComments([]))
      .finally(() => setLoadingComments(false));
  }, [hendelse.id]);

  async function handleStatusChange(newStatusNavn) {
    setSaving(true);
    try {
      // Finn Status_ID basert på navnet i dropdown
      const statusObj = (statuses || []).find(s => s.Navn === newStatusNavn);
      const statusId = statusObj?.Status_ID || newStatusNavn;
      
      await hendelser.updateStatus(hendelse.id, statusId);
      onUpdated?.(); 
    } catch (err) {
      alert("Feil ved oppdatering av status: " + err.message);
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
        <h2>Hendelsesdetaljer</h2>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
      </div>

      <div className={styles.detailContent}>
        <div className={styles.detailSection}>
          <label>Tittel</label>
          <p><strong>{hendelse.tittel}</strong></p>
        </div>

        <div className={styles.detailGrid}>
          <div className={styles.detailSection}>
            <label>Status</label>
            <select 
              className="select" 
              value={hendelse.status} 
              onChange={e => handleStatusChange(e.target.value)}
              disabled={saving}
            >
              <option value="">Velg status</option>
              {(statuses || []).map(s => (
                <option key={s.Status_ID} value={s.Navn}>{s.Navn}</option>
              ))}
            </select>
          </div>
          <div className={styles.detailSection}>
            <label>Prioritering</label>
            <p>{hendelse.prioritering}</p>
          </div>
        </div>

        <div className={styles.detailSection}>
          <label>Beskrivelse</label>
          <div className={styles.descBox}>
            {hendelse.beskrivelse || 'Ingen beskrivelse tilgjengelig.'}
          </div>
        </div>

        <hr className="divider" />

        <div className={styles.detailSection}>
          <h3>Kommentarer</h3>
          {loadingComments ? (
            <div className="loading-center"><span className="spinner" /></div>
          ) : (
            <div className={styles.commentsList}>
              {comments.length === 0 && <p style={{color: 'var(--c-muted)'}}>Ingen kommentarer.</p>}
              {comments.map(c => (
                <div key={c.id} className={styles.comment}>
                  <div className={styles.commentMeta}>
                    <strong>{c.brukernavn || 'System'}</strong>
                    <span>{new Date(c.tidspunkt).toLocaleString('nb-NO')}</span>
                  </div>
                  <p>{c.tekst || c.innhold}</p>
                </div>
              ))}
            </div>
          )}

          <div className={styles.commentInputWrap}>
            <textarea
              className="textarea"
              placeholder="Skriv en kommentar..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
            />
            <button 
              className="btn btn-primary" 
              onClick={handleAddComment}
              disabled={saving || !newComment.trim()}
            >
              {saving ? <span className="spinner" /> : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ManagementPage() {
  const [hendelserList, setHendelserList] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedHendelse, setSelectedHendelse] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      const [h, s] = await Promise.all([
        hendelser.getAll(),
        lookup.getStatuses(),
      ]);
      setHendelserList(Array.isArray(h) ? h.map(normalizeHendelse) : []);
      // VIKTIG: Pakker ut 'statuser' fra objektet
      setStatuses(s?.statuser || []);
    } catch (err) {
      setError("Kunne ikke hente data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = hendelserList.filter(h =>
    h.tittel.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.beskrivelse.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.management}>
      <div className={styles.listPanel}>
        <div className="page-header">
          <h1>Hendelsestyring</h1>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <div className="field" style={{ marginBottom: '1.5rem' }}>
          <input
            className="input"
            placeholder="Søk i hendelser..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="loading-center"><span className="spinner" /></div>
        ) : (
          <div className={styles.hendelserGrid}>
            {filtered.map(h => (
              <HendelseCard
                key={h.id}
                hendelse={h}
                onSelect={setSelectedHendelse}
              />
            ))}
          </div>
        )}
      </div>

      {selectedHendelse && (
        <DetailPanel
          hendelse={selectedHendelse}
          statuses={statuses}
          onClose={() => setSelectedHendelse(null)}
          onUpdated={() => {
            // Refetcher listen og oppdaterer den valgte hendelsen i panelet
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