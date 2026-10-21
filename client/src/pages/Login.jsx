import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api, { errMsg } from '../api';
import { Field, Icon } from '../components/ui';
import AuthShell from './AuthShell';

const DEMO = {
  user: [
    ['Staff', 'staff1@hospital.com', 'Staff@123'],
    ['Patient', 'patient@hospital.com', 'Patient@123'],
  ],
  admin: [['Admin', 'admin@hospital.com', 'Admin@123']],
};

const EMPTY_REG = { name: '', email: '', password: '', confirm: '', adminKey: '' };

export default function Login({ initialMode = 'user' }) {
  const { t } = useTranslation();
  const { login, adminLogin } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState(initialMode); // 'user' (patient / staff) or 'admin'
  const [view, setView] = useState('login'); // admin tab only: 'login' or 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reg, setReg] = useState(EMPTY_REG);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isAdmin = mode === 'admin';
  const registering = isAdmin && view === 'register';

  const switchMode = (m) => { setMode(m); setView('login'); setError(''); setEmail(''); setPassword(''); setReg(EMPTY_REG); };
  const showView = (v) => { setView(v); setError(''); };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await (isAdmin ? adminLogin : login)(email.trim(), password);
      toast.success(t('Logged in'));
      nav('/', { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const submitRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (reg.password !== reg.confirm) return setError(t('Passwords do not match'));
    setBusy(true);
    try {
      await api.post('/auth/admin-register', { name: reg.name.trim(), email: reg.email.trim(), password: reg.password, adminKey: reg.adminKey });
      toast.success(t('Admin account created. You can now log in.'));
      setEmail(reg.email.trim());
      setPassword('');
      setReg(EMPTY_REG);
      setView('login'); // register first, then log in
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const setR = (k) => (e) => setReg({ ...reg, [k]: e.target.value });

  return (
    <AuthShell>
      <div className="tabs" role="tablist" aria-label={t('Login type')}>
        <button type="button" role="tab" aria-selected={!isAdmin} className={`tab ${!isAdmin ? 'active' : ''}`} onClick={() => switchMode('user')}>{t('Patient / Staff')}</button>
        <button type="button" role="tab" aria-selected={isAdmin} className={`tab ${isAdmin ? 'active' : ''}`} onClick={() => switchMode('admin')}><Icon name="shield" size={14} /> {t('Admin')}</button>
      </div>

      {registering ? (
        <>
          <h1>{t('Admin registration')}</h1>
          <p className="muted mb">{t('You need the admin registration key to create an administrator account.')}</p>
          <form onSubmit={submitRegister} noValidate>
            <Field label="Full name"><input type="text" autoComplete="name" value={reg.name} maxLength={80} onChange={setR('name')} required /></Field>
            <Field label="Email address"><input type="email" autoComplete="email" inputMode="email" value={reg.email} onChange={setR('email')} required /></Field>
            <Field label="Password" hint="At least 8 characters with a letter and a number"><input type="password" autoComplete="new-password" value={reg.password} onChange={setR('password')} required /></Field>
            <Field label="Confirm password"><input type="password" autoComplete="new-password" value={reg.confirm} onChange={setR('confirm')} required /></Field>
            <Field label="Admin registration key" hint="Given to you by the system owner (set in server/.env)"><input type="password" autoComplete="off" value={reg.adminKey} onChange={setR('adminKey')} required /></Field>
            {error && <p className="error-text" role="alert">{error}</p>}
            <button className="btn btn-primary btn-block" disabled={busy || !reg.name || !reg.email || !reg.password || !reg.confirm || !reg.adminKey}>{busy ? '...' : t('Create admin account')}</button>
          </form>
          <p className="mt center muted">{t('Already registered?')} <button type="button" className="link-btn" onClick={() => showView('login')}><b>{t('Admin login')}</b></button></p>
        </>
      ) : (
        <>
          <h1>{isAdmin ? t('Admin sign in') : t('Welcome back')}</h1>
          <p className="muted mb">{isAdmin ? t('Only authorised administrators can continue.') : t('Sign in')}</p>
          <form onSubmit={submit} noValidate>
            <Field label="Email address"><input type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
            <Field label="Password"><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
            {error && <p className="error-text" role="alert">{error}</p>}
            <button className="btn btn-primary btn-block" disabled={busy || !email || !password}>{busy ? '...' : isAdmin ? t('Admin login') : t('Login')}</button>
          </form>
          <div className="row between mt">
            <Link to="/forgot-password">{t('Forgot password?')}</Link>
            {isAdmin ? (
              <span className="muted">{t('New admin?')} <button type="button" className="link-btn" onClick={() => showView('register')}><b>{t('Register')}</b></button></span>
            ) : (
              <span className="muted">{t('New here?')} <Link to="/register"><b>{t('Register')}</b></Link></span>
            )}
          </div>
          <div className="demo">
            <strong>{t('Demo accounts')}</strong> <span className="muted">({t('Tap to fill')})</span>
            {DEMO[mode].map(([r, e, p]) => (
              <button key={r} type="button" onClick={() => { setEmail(e); setPassword(p); }}>{r}: {e}</button>
            ))}
          </div>
        </>
      )}
    </AuthShell>
  );
}