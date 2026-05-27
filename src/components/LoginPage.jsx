import { useState } from 'react';
import { auth } from '../services/api';
import styles from '../styles/LoginPage.module.css';

export default function LoginPage({ onLogin }) {
  const [brukernavn, setBrukernavn] = useState('');
  const [passord, setPassord] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await auth.login(brukernavn, passord);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin?.(data.user);
    } catch (err) {
      setError(err.message || 'Innlogging feilet');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.box}>
        <div className={styles.brand}>
          <span className={styles.brandMark} />
          <span className={styles.brandName}>Hendelsesystem</span>
        </div>

        <h1 className={styles.title}>Logg inn</h1>
        <p className={styles.subtitle}>Skriv inn brukernavn og passord for å fortsette</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className="field">
            <label htmlFor="brukernavn">Brukernavn</label>
            <input
              id="brukernavn"
              className="input"
              type="text"
              value={brukernavn}
              onChange={e => setBrukernavn(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="passord">Passord</label>
            <input
              id="passord"
              className="input"
              type="password"
              value={passord}
              onChange={e => setPassord(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
            {loading ? <span className="spinner" /> : 'Logg inn'}
          </button>
        </form>
      </div>
    </div>
  );
}