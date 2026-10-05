import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, auth } from '../api';

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await api.login(email, password);
      auth.set(r.token);
      nav('/admin/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="panel narrow">
      <h2>Admin login</h2>
      <form onSubmit={submit} noValidate className="form">
        <label className="field">
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </label>
        <label className="field">
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        {error && <div className="err banner" role="alert">{error}</div>}
        <button className="btn" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
      </form>
      <p><Link to="/">Back to site</Link></p>
    </main>
  );
}