import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { Field } from '../components/ui';
import AuthShell from './AuthShell';

export function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await api.post('/auth/forgot-password', { email: email.trim() });
      setDone(r.data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <h1>{t('Reset password')}</h1>
      <p className="muted mb">{t('Enter your email and we will send you a reset link.')}</p>
      {done ? (
        <div className="stack">
          <div className="alert ok">{done.message}</div>
          {done.devResetLink && (
            <div className="alert info small">
              Dev mode (no SMTP configured): <a href={done.devResetLink}>open the reset link</a>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <Field label="Email address"><input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
          {error && <p className="error-text" role="alert">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={busy || !email}>{busy ? '...' : t('Send reset link')}</button>
        </form>
      )}
      <p className="mt center"><Link to="/login">{t('Back to login')}</Link></p>
    </AuthShell>
  );
}

export function ResetPassword() {
  const { t } = useTranslation();
  const { token } = useParams();
  const nav = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) return setError(t('Passwords do not match'));
    setBusy(true);
    try {
      await api.post(`/auth/reset-password/${token}`, { password });
      toast.success(t('Password updated'));
      nav('/login', { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <h1>{t('Reset password')}</h1>
      <p className="muted mb">{t('Choose a new password for your account.')}</p>
      <form onSubmit={submit} noValidate>
        <Field label="New password" hint="At least 8 characters with a letter and a number"><input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
        <Field label="Confirm password"><input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></Field>
        {error && <p className="error-text" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy || !password}>{busy ? '...' : t('Reset password')}</button>
      </form>
      <p className="mt center"><Link to="/login">{t('Back to login')}</Link></p>
    </AuthShell>
  );
}
