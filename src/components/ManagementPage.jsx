import { useState, useEffect } from 'react';
import { hendelser, kommentarer, brukere, lookup } from '../services/api';
import styles from '../styles/ManagementPage.module.css';

function HendelseCard({ hendelse, onSelect }) {
  return (
    <div className={`card ${styles.hendelseCard}`} onClick={() => onSelect(hendelse)}>
      <div className={styles.hendelseHeader}>
        <h3>{hendelse.tittel}</h3>
        <span className="badge badge-neutral">{hendelse.status || '—'}</span>
      </div>
      <p style={{ color: 'var(--c-text-2)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
        {hendelse.beskrivelse || 'Ingen beskrivelse'}
      </p>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--c-muted)' }}>
        <span>Prioritering: {hendelse.prioritering || '—'}</span>
        <span>Ansvarlig: {hendelse.ansvarlig || '—'}</span>
      </div>
    </div>
  );
}

function DetailPanel({ hendelse, users, statuses, onClose, onUpdated }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(hendelse.status);

  useEffect(() => {
    kommentarer.getByHendelse(hendelse.id)
      .then(setComments)
      .finally(() => setLoadingComments(false));
  }, [hendelse.id]);

  async function handleAddComment() {
    if (!newComment.trim()) return;
    setSaving(true);
    try {
      await kommentarer.create(hendelse.id, newComment);
      const updated = await kommentarer.getByHendelse(hendelse.id);
      setComments(updated);
      setNewComment('');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(newStatus) {
    setSaving(true);
    try {
      await hendelser.updateStatus(hendelse.id, newStatus);
      setStatus(newStatus);
      onUpdated?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteComment(id) {
    if (!confirm('Slett kommentar?')) return;
    try {
      await kommentarer.delete(id);
      setComments(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className={styles.detailPanel}>
      <div className={styles.detailHeader}>
        <h2>{hendelse.tittel}</h2>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
      </div>

      <div className={styles.detailContent}>
        <div className={styles.detailSection}>
          <label>Beskrivelse</label>
          <p style={{ color: 'var(--c-text-2)' }}>{hendelse.beskrivelse || 'Ingen beskrivelse'}</p>
        </div>

        <div className={styles.detailGrid}>
          <div className={styles.detailSection}>
            <label>Status</label>
            <select 
              className="select" 
              value={status} 
              onChange={e => handleStatusChange(e.target.value)}
              disabled={saving}
            >
              {statuses.map(s => (
                <option key={s.id} value={s.navn}>{s.navn}</option>
              ))}
            </select>
          </div>

          <div className={styles.detailSection}>
            <label>Prioritering</label>
            <p>{hendelse.prioritering || '—'}</p>
          </div>

          <div className={styles.detailSection}>
            <label>Ansvarlig</label>
            <p>{hendelse.ansvarlig || '—'}</p>
          </div>

          <div className={styles.detailSection}>
            <label>Opprettet</label>
            <p>{new Date(hendelse.tidspunkt_opprettet).toLocaleString('nb-NO')}</p>
          </div>
        </div>

        <hr className="divider" />

        <div className={styles.detailSection}>
          <h3 style={{ marginBottom: '1rem' }}>Kommentarer</h3>
          
          {loadingComments ? (
            <div className="loading-center"><span className="spinner" /></div>
          ) : (
            <>
              <div className={styles.commentsList}>
                {comments.length === 0 ? (
                  <p style={{ color: 'var(--c-muted)' }}>Ingen kommentarer ennå</p>
                ) : (
                  comments.map(c => (
                    <div key={c.id} className={styles.comment}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ fontSize: '0.875rem' }}>{c.bruker_navn || c.brukernavn || 'Anonym'}</strong>
                          <p style={{ fontSize: '0.75rem', color: 'var(--c-muted)' }}>
                            {new Date(c.tidspunkt).toLocaleString('nb-NO')}
                          </p>
                        </div>
                        <button 
                          className="btn btn-danger btn-sm" 
                          onClick={() => handleDeleteComment(c.id)}
                        >
                          Slett
                        </button>
                      </div>
                      <p style={{ marginTop: '0.5rem', color: 'var(--c-text-2)' }}>{c.tekst || c.innhold}</p>
                    </div>
                  ))
                )}
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <textarea
                  className="input"
                  style={{ resize: 'vertical', minHeight: '60px' }}
                  placeholder="Legg til kommentar..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  disabled={saving}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={handleAddComment}
                disabled={saving || !newComment.trim()}
                style={{ marginTop: '0.5rem' }}
              >
                {saving ? <span className="spinner" /> : 'Legg til kommentar'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ManagementPage() {
  const [hendelserList, setHendelserList] = useState([]);
  const [users, setUsers] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedHendelse, setSelectedHendelse] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [h, u, s] = await Promise.all([
          hendelser.getAll(),
          brukere.getAll(),
          lookup.getStatuses?.() || Promise.resolve([]),
        ]);
        setHendelserList(h || []);
        setUsers(u || []);
        setStatuses(s || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = hendelserList.filter(h =>
    h.tittel.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (h.beskrivelse && h.beskrivelse.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className={styles.management}>
      <div className={styles.listPanel}>
        <div className="page-header" style={{ padding: '0' }}>
          <div>
            <h1>Hendelsestyring</h1>
            <p style={{ color: 'var(--c-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
              Administrer hendelser og kommentarer
            </p>
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <div className="field" style={{ marginBottom: '1rem' }}>
          <input
            className="input"
            type="text"
            placeholder="Søk hendelser..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="loading-center"><span className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty"><h3>Ingen hendelser</h3></div>
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
          users={users}
          statuses={statuses}
          onClose={() => setSelectedHendelse(null)}
          onUpdated={() => {
            setHendelserList(prev => prev.map(h => 
              h.id === selectedHendelse.id 
                ? { ...h, status: selectedHendelse.status }
                : h
            ));
          }}
        />
      )}
    </div>
  );
}
