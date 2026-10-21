import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { useAuth } from '../context/AuthContext';
import { useDebounce, clean } from '../hooks';
import { Badge, Empty, Field, Icon, Loader, Modal, PageHeader, Pagination } from '../components/ui';

const EMPTY = { name: '', email: '', password: '', role: 'staff', department: '', designation: '', isDoctor: false, phone: '', isActive: true };
const ROLE_TONE = { admin: 'red', staff: 'blue', patient: 'teal' };

export default function Users() {
  const { t } = useTranslation();
  const { user: me } = useAuth();
  const [data, setData] = useState(null);
  const [depts, setDepts] = useState([]);
  const [page, setPage] = useState(1);
  const [f, setF] = useState({ q: '', role: '', active: '' });
  const q = useDebounce(f.q);
  const [form, setForm] = useState(null); // null = closed, {_id?} = open
  const [pw, setPw] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api.get('/departments').then((r) => setDepts(r.data.items)).catch(() => {}); }, []);

  const load = useCallback(() => {
    api.get('/users', { params: clean({ q, role: f.role, active: f.active, page, limit: 12 }) })
      .then((r) => setData(r.data))
      .catch((e) => toast.error(errMsg(e)));
  }, [q, f.role, f.active, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [q, f.role, f.active]);

  const openNew = () => { setError(''); setForm({ ...EMPTY }); };
  const openEdit = (u) => { setError(''); setForm({ ...EMPTY, ...u, department: u.department ? u.department._id : '', password: '' }); };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const body = { name: form.name.trim(), role: form.role, department: form.role === 'staff' ? form.department : '', designation: form.designation, isDoctor: form.role === 'staff' && form.isDoctor, phone: form.phone };
      if (form._id) {
        await api.put(`/users/${form._id}`, { ...body, isActive: form.isActive });
      } else {
        await api.post('/users', { ...body, email: form.email.trim(), password: form.password });
      }
      toast.success(t('Saved'));
      setForm(null);
      load();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (u) => {
    try {
      await api.put(`/users/${u._id}`, { isActive: !u.isActive });
      toast.success(t('Saved'));
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const savePw = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.put(`/users/${pw._id}/password`, { password: pw.password });
      toast.success(t('Saved'));
      setPw(null);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Users" actions={<button className="btn btn-primary" onClick={openNew}><Icon name="plus" size={18} /> {t('Add user')}</button>} />
      <div className="toolbar">
        <div className="search"><Icon name="search" size={18} /><input type="search" placeholder={t('Search by name or email')} value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} /></div>
      </div>
      <div className="filters show">
        <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} aria-label={t('Role')}>
          <option value="">{t('All roles')}</option><option value="patient">{t('patient')}</option><option value="staff">{t('staff')}</option><option value="admin">{t('admin')}</option>
        </select>
        <select value={f.active} onChange={(e) => setF({ ...f, active: e.target.value })} aria-label={t('Status')}>
          <option value="">{t('All statuses')}</option><option value="true">{t('Active')}</option><option value="false">{t('Inactive')}</option>
        </select>
      </div>

      {!data ? <Loader /> : data.items.length === 0 ? <Empty title="No results found" icon="users" /> : (
        <div className="list">
          {data.items.map((u) => (
            <div className="item" key={u._id}>
              <div className="item-top">
                <div style={{ minWidth: 0 }}>
                  <div className="item-title">{u.name}{u._id === me._id ? ` (${t('You')})` : ''}</div>
                  <div className="muted small truncate">{u.email}</div>
                </div>
                <div className="badges">
                  <Badge tone={ROLE_TONE[u.role]}>{t(u.role)}</Badge>
                  {!u.isActive && <Badge tone="slate">{t('Inactive')}</Badge>}
                </div>
              </div>
              <div className="item-meta">
                {u.department && <span>🏥 {u.department.name}</span>}
                {u.designation && <span>🩺 {u.designation}</span>}
                {u.phone && <span>📞 {u.phone}</span>}
              </div>
              <div className="row mt-s">
                <button className="btn btn-outline btn-sm" onClick={() => openEdit(u)}><Icon name="edit" size={16} /> {t('Edit')}</button>
                <button className="btn btn-outline btn-sm" onClick={() => { setError(''); setPw({ _id: u._id, name: u.name, password: '' }); }}>{t('Set password')}</button>
                {u._id !== me._id && <button className="btn btn-ghost btn-sm" onClick={() => toggle(u)}>{u.isActive ? t('Deactivate') : t('Activate')}</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}

      <Modal open={!!form} title={form && form._id ? 'Edit user' : 'Add user'} onClose={() => setForm(null)}>
        {form && (
          <form onSubmit={save} noValidate>
            <div className="form-grid">
              <Field label="Full name"><input type="text" value={form.name} onChange={set('name')} required maxLength={80} /></Field>
              <Field label="Email address"><input type="email" value={form.email} onChange={set('email')} disabled={!!form._id} required /></Field>
              {!form._id && <Field label="Password" hint="At least 8 characters with a letter and a number"><input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" required /></Field>}
              <Field label="Role">
                <select value={form.role} onChange={set('role')} disabled={form._id === me._id}>
                  <option value="staff">{t('staff')}</option><option value="admin">{t('admin')}</option><option value="patient">{t('patient')}</option>
                </select>
              </Field>
              {form.role === 'staff' && (
                <>
                  <Field label="Department">
                    <select value={form.department} onChange={set('department')}>
                      <option value="">{t('Select department')}</option>
                      {depts.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Designation"><input type="text" value={form.designation || ''} onChange={set('designation')} maxLength={60} placeholder="Cardiologist, Nurse..." /></Field>
                </>
              )}
              <Field label="Phone number"><input type="tel" value={form.phone || ''} onChange={set('phone')} /></Field>
            </div>
            {form.role === 'staff' && <label className="check"><input type="checkbox" checked={!!form.isDoctor} onChange={set('isDoctor')} /> {t('Is a doctor')}</label>}
            {form._id && form._id !== me._id && <label className="check"><input type="checkbox" checked={!!form.isActive} onChange={set('isActive')} /> {t('Active account')}</label>}
            {error && <p className="error-text" role="alert">{error}</p>}
            <div className="row"><button className="btn btn-primary" disabled={busy}>{busy ? '...' : t('Save')}</button><button type="button" className="btn btn-outline" onClick={() => setForm(null)}>{t('Cancel')}</button></div>
          </form>
        )}
      </Modal>

      <Modal open={!!pw} title="Set password" onClose={() => setPw(null)}>
        {pw && (
          <form onSubmit={savePw} noValidate>
            <p className="muted mb">{pw.name}</p>
            <Field label="Password" hint="At least 8 characters with a letter and a number"><input type="password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} autoComplete="new-password" required /></Field>
            {error && <p className="error-text" role="alert">{error}</p>}
            <div className="row"><button className="btn btn-primary" disabled={busy || !pw.password}>{busy ? '...' : t('Save')}</button><button type="button" className="btn btn-outline" onClick={() => setPw(null)}>{t('Cancel')}</button></div>
          </form>
        )}
      </Modal>
    </>
  );
}
