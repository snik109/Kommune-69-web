import { useState, useEffect } from 'react';
import { hendelser, kommentarer, tiltak, lookup, brukere } from '../services/api';
import styles from '../styles/HendelseDetailPage.module.css';

function Section({ title, children }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

function KommentarList({ hendelseId }) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [innhold, setInnhold] = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    kommentarer.getByHendelse(hendelseId).then(setItems).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [hendelseId]);

  async function submit(e) {
    e.preventDefault();
    if (!innhold.trim()) return;
    setSaving(true);
    try {
      const k = await kommentarer.create(hendelseId, innhold);
      setItems(prev => [...prev, k]);
      setInnhold('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm('Slett kommentar?')) return;
    try {
      await kommentarer.delete(id);
      setItems(prev => prev.filter(k => k.id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="stack">
      {error && <div className="alert alert-error">{error}</div>}
      {loading ? <div className="loading-center"><span className="spinner" /></div> : (
        items.length === 0
          ? <p style={{ color: 'var(--c-muted)', fontSize: '0.875rem' }}>Ingen kommentarer enda.</p>
          : items.map(k => (
            <div key={k.id} className={styles.kommentarItem}>
              <div className={styles.kommentarMeta}>
                <strong>{k.bruker || 'Ukjent'}</strong>
                <span>{k.opprettetTid ? new Date(k.opprettetTid).toLocaleString('nb-NO') : ''}</span>
                <button className="btn btn-danger btn-sm" onClick={() => remove(k.id)}>Slett</button>
              </div>
              <p>{k.innhold}</p>
            </div>
          ))
      )}
      <form onSubmit={submit} className={styles.kommentarForm}>
        <textarea
          className="textarea"
          placeholder="Skriv en kommentar…"
          value={innhold}
          onChange={e => setInnhold(e.target.value)}
        />
        <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>
          {saving ? <span className="spinner" /> : 'Legg til'}
        </button>
      </form>
    </div>
  );
}

function TiltakList({ hendelseId }) {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [beskrivelse, setBeskrivelse] = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    tiltak.getByHendelse(hendelseId).then(setItems).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [hendelseId]);

  async function submit(e) {
    e.preventDefault();
    if (!beskrivelse.trim()) return;
    setSaving(true);
    try {
      const t = await tiltak.add(hendelseId, { beskrivelse });
      setItems(prev => [...prev, t]);
      setBeskrivelse('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm('Slett tiltak?')) return;
    try {
      await tiltak.delete(id);
      setItems(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="stack">
      {error && <div className="alert alert-error">{error}</div>}
      {loading ? <div className="loading-center"><span className="spinner" /></div> : (
        items.length === 0
          ? <p style={{ color: 'var(--c-muted)', fontSize: '0.875rem' }}>Ingen tiltak registrert.</p>
          : items.map(t => (
            <div key={t.id} className={styles.tiltakItem}>
              <span>{t.beskrivelse}</span>
              <button className="btn btn-danger btn-sm" onClick={() => remove(t.id)}>Slett</button>
            </div>
          ))
      )}
      <form onSubmit={submit} className={styles.kommentarForm}>
        <input
          className="input"
          placeholder="Beskriv tiltaket…"
          value={beskrivelse}
          onChange={e => setBeskrivelse(e.target.value)}
        />
        <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>
          {saving ? <span className="spinner" /> : 'Legg til'}
        </button>
      </form>
    </div>
  );
}

export default function HendelseDetailPage({ hendelseId, onBack }) {
  const [hendelse, setHendelse] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [saving, setSaving]         = useState({});

  useEffect(() => {
    (async () => {
      try {
        const [h, s, p, u] = await Promise.all([
          hendelser.getById(hendelseId),
          lookup.getStatuses(),
          lookup.getPriorities(),
          brukere.getAll(),
        ]);
        setHendelse(h);
        setStatuses(s);
        setPriorities(p);
        setUsers(u);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [hendelseId]);

  async function patch(field, value) {
    setSaving(s => ({ ...s, [field]: true }));
    try {
      if (field === 'status')      await hendelser.updateStatus(hendelseId, value);
      if (field === 'prioritering') await hendelser.updatePriority(hendelseId, value);
      if (field === 'ansvarlig')   await hendelser.updateResponsible(hendelseId, value);
      setHendelse(h => ({ ...h, [field]: value }));
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(s => ({ ...s, [field]: false }));
    }
  }

  if (loading) return <div className="loading-center"><span className="spinner" /></div>;
  if (error) return <div className="page"><div className="alert alert-error">{error}</div></div>;
  if (!hendelse) return null;

  return (
    <div className="page">
      <div className="page-header">
        <div className="row">
          <button className="btn btn-ghost btn-sm" onClick={onBack}>← Tilbake</button>
          <h1 className={styles.title}>{hendelse.tittel}</h1>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.main}>
          {hendelse.beskrivelse && (
            <Section title="Beskrivelse">
              <p style={{ color: 'var(--c-text-2)', lineHeight: 1.7 }}>{hendelse.beskrivelse}</p>
            </Section>
          )}

          <Section title="Tiltak">
            <TiltakList hendelseId={hendelseId} />
          </Section>

          <Section title="Kommentarer">
            <KommentarList hendelseId={hendelseId} />
          </Section>
        </div>

        <aside className={styles.sidebar}>
          <div className="card stack">
            <div className="field">
              <label>Status</label>
              <select className="select" value={hendelse.statusId || ''} onChange={e => patch('status', e.target.value)} disabled={saving.status}>
                <option value="">Velg status</option>
                {statuses.map(s => <option key={s.id} value={s.id}>{s.navn}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Prioritering</label>
              <select className="select" value={hendelse.prioriteringId || ''} onChange={e => patch('prioritering', e.target.value)} disabled={saving.prioritering}>
                <option value="">Velg prioritering</option>
                {priorities.map(p => <option key={p.id} value={p.id}>{p.navn}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Ansvarlig</label>
              <select className="select" value={hendelse.ansvarligId || ''} onChange={e => patch('ansvarlig', e.target.value)} disabled={saving.ansvarlig}>
                <option value="">Ikke tildelt</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.brukernavn}</option>)}
              </select>
            </div>
            {hendelse.opprettetTid && (
              <p style={{ fontSize: '0.78rem', color: 'var(--c-muted)' }}>
                Opprettet {new Date(hendelse.opprettetTid).toLocaleString('nb-NO')}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}