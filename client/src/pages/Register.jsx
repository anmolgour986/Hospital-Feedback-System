import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../api';
import { Field } from '../components/ui';
import AuthShell from './AuthShell';

export default function Register() {
  const { t, i18n } = useTranslation();
  const { register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (f.password !== f.confirm) return setError(t('Passwords do not match'));
    setBusy(true);
    try {
      await register({ name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim() || undefined, password: f.password, language: i18n.language });
      toast.success(t('Account created'));
      nav('/', { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <h1>{t('Create account')}</h1>
      <p className="muted mb">{t('Patient')}</p>
      <form onSubmit={submit} noValidate>
        <Field label="Full name"><input type="text" autoComplete="name" value={f.name} onChange={set('name')} required minLength={2} /></Field>
        <Field label="Email address"><input type="email" autoComplete="email" inputMode="email" value={f.email} onChange={set('email')} required /></Field>
        <Field label="Phone number" hint="Optional"><input type="tel" autoComplete="tel" inputMode="tel" value={f.phone} onChange={set('phone')} /></Field>
        <Field label="Password" hint="At least 8 characters with a letter and a number"><input type="password" autoComplete="new-password" value={f.password} onChange={set('password')} required /></Field>
        <Field label="Confirm password"><input type="password" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} required /></Field>
        {error && <p className="error-text" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy || !f.name || !f.email || !f.password}>{busy ? '...' : t('Register')}</button>
      </form>
      <p className="muted mt center">{t('Already have an account?')} <Link to="/login"><b>{t('Login')}</b></Link></p>
    </AuthShell>
  );
}
