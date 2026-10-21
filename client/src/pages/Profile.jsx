import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { useAuth } from '../context/AuthContext';
import { Field, Icon, PageHeader } from '../components/ui';
import { setLanguage } from '../i18n';

export default function Profile() {
  const { t } = useTranslation();
  const { user, setUser, logout } = useAuth();
  const [p, setP] = useState({ name: user.name, phone: user.phone || '', language: user.language || 'en', emailNotifications: user.emailNotifications !== false });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [del, setDel] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState({});

  const saveProfile = async (e) => {
    e.preventDefault();
    setErr({});
    setBusy('profile');
    try {
      const r = await api.put('/auth/profile', { name: p.name.trim(), phone: p.phone.trim(), language: p.language, emailNotifications: p.emailNotifications });
      setUser(r.data.user);
      setLanguage(p.language);
      toast.success(t('Profile updated'));
    } catch (x) {
      setErr({ profile: errMsg(x) });
    } finally {
      setBusy('');
    }
  };

  const savePw = async (e) => {
    e.preventDefault();
    setErr({});
    if (pw.newPassword !== pw.confirm) return setErr({ pw: t('Passwords do not match') });
    setBusy('pw');
    try {
      await api.put('/auth/password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      toast.success(t('Password updated successfully'));
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (x) {
      setErr({ pw: errMsg(x) });
    } finally {
      setBusy('');
    }
  };

  const exportData = async () => {
    setBusy('export');
    try {
      const r = await api.get('/auth/export', { responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-data.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (x) {
      toast.error(errMsg(x));
    } finally {
      setBusy('');
    }
  };

  const deleteAccount = async (e) => {
    e.preventDefault();
    if (!window.confirm(t('This permanently removes your personal details. Feedback and complaints are kept anonymously.'))) return;
    setErr({});
    setBusy('del');
    try {
      await api.delete('/auth/account', { data: { password: del } });
      toast.success(t('Your account has been deleted'));
      logout();
    } catch (x) {
      setErr({ del: errMsg(x) });
      setBusy('');
    }
  };

  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <PageHeader title="My profile" subtitle={`${user.email} · ${t(user.role)}${user.department ? ` · ${user.department.name}` : ''}`} />

      <form className="card" onSubmit={saveProfile} noValidate>
        <div className="form-grid">
          <Field label="Full name"><input type="text" value={p.name} maxLength={80} onChange={(e) => setP({ ...p, name: e.target.value })} required /></Field>
          <Field label="Phone number"><input type="tel" value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} /></Field>
          <Field label="Language">
            <select value={p.language} onChange={(e) => setP({ ...p, language: e.target.value })}><option value="en">English</option><option value="hi">हिन्दी</option></select>
          </Field>
        </div>
        <label className="check"><input type="checkbox" checked={p.emailNotifications} onChange={(e) => setP({ ...p, emailNotifications: e.target.checked })} /> {t('Email notifications')}</label>
        {err.profile && <p className="error-text" role="alert">{err.profile}</p>}
        <button className="btn btn-primary" disabled={busy === 'profile' || p.name.trim().length < 2}>{busy === 'profile' ? '...' : t('Save')}</button>
      </form>

      <form className="card" onSubmit={savePw} noValidate>
        <div className="card-title"><h3>{t('Change password')}</h3></div>
        <Field label="Current password"><input type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required /></Field>
        <div className="form-grid">
          <Field label="New password" hint="At least 8 characters with a letter and a number"><input type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required /></Field>
          <Field label="Confirm password"><input type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required /></Field>
        </div>
        {err.pw && <p className="error-text" role="alert">{err.pw}</p>}
        <button className="btn btn-primary" disabled={busy === 'pw' || !pw.currentPassword || !pw.newPassword}>{busy === 'pw' ? '...' : t('Update password')}</button>
      </form>

      <div className="card">
        <div className="card-title"><h3>{t('Privacy & data')}</h3></div>
        <p className="muted mb">{t('You can download a copy of everything we store about you.')}</p>
        <button className="btn btn-outline" onClick={exportData} disabled={busy === 'export'}><Icon name="download" size={18} /> {t('Download my data')}</button>
        {user.role === 'patient' && (
          <form onSubmit={deleteAccount} className="mt" noValidate>
            <h3 style={{ color: 'var(--danger)' }}>{t('Delete my account')}</h3>
            <p className="muted mb small">{t('This permanently removes your personal details. Feedback and complaints are kept anonymously.')}</p>
            <Field label="Enter your password to confirm"><input type="password" autoComplete="current-password" value={del} onChange={(e) => setDel(e.target.value)} /></Field>
            {err.del && <p className="error-text" role="alert">{err.del}</p>}
            <button className="btn btn-danger" disabled={!del || busy === 'del'}>{t('Delete my account')}</button>
          </form>
        )}
      </div>
    </div>
  );
}
