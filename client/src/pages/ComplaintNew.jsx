import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { Field, PageHeader } from '../components/ui';
import { CATEGORIES, PRIORITIES } from '../constants';

export default function ComplaintNew() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [depts, setDepts] = useState([]);
  const [f, setF] = useState({ department: '', title: '', description: '', priority: 'Medium', category: '', isAnonymous: false });
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get('/departments').then((r) => setDepts(r.data.items)).catch((e) => toast.error(errMsg(e))); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!f.department) return toast.error(t('Please select a department'));
    setBusy(true);
    try {
      const r = await api.post('/complaints', { ...f, title: f.title.trim(), description: f.description.trim(), category: f.category || undefined });
      toast.success(t('Complaint registered'));
      nav(`/complaints/${r.data.complaint._id}`, { replace: true });
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <PageHeader title="Register a complaint" subtitle={t('Category and sentiment are detected automatically')} />
      <form className="card" onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field label="Department">
            <select value={f.department} onChange={set('department')} required>
              <option value="">{t('Select department')}</option>
              {depts.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select value={f.priority} onChange={set('priority')}>{PRIORITIES.map((p) => <option key={p} value={p}>{t(p)}</option>)}</select>
          </Field>
          <div className="span-2"><Field label="Short title"><input type="text" value={f.title} maxLength={150} onChange={set('title')} required /></Field></div>
          <div className="span-2"><Field label="Describe the problem"><textarea value={f.description} maxLength={3000} onChange={set('description')} required /></Field></div>
          <Field label="Category">
            <select value={f.category} onChange={set('category')}>
              <option value="">{t('Auto-detect')}</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{t(c)}</option>)}
            </select>
          </Field>
        </div>
        <label className="check"><input type="checkbox" checked={f.isAnonymous} onChange={set('isAnonymous')} /><span>{t('Submit anonymously (hide my name from staff)')}</span></label>
        <button className="btn btn-primary btn-block" disabled={busy || f.title.trim().length < 5 || f.description.trim().length < 10}>{busy ? '...' : t('Submit')}</button>
      </form>
    </div>
  );
}
