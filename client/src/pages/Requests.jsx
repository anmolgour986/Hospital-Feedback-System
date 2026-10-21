import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { useAuth } from '../context/AuthContext';
import { useOnNotification } from '../context/RealtimeContext';
import { clean } from '../hooks';
import { Badge, Empty, Field, Icon, Loader, Modal, PageHeader, Pagination } from '../components/ui';
import { PRIORITIES, REQUEST_STATUSES, REQUEST_TYPES, fmtDate } from '../constants';

const STEPS = ['Pending', 'Accepted', 'In Progress', 'Completed'];

function Tracker({ status }) {
  const { t } = useTranslation();
  if (status === 'Cancelled') return <div className="mt-s"><Badge value="Cancelled" /></div>;
  const idx = STEPS.indexOf(status);
  return (
    <div className="mt-s" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4 }} aria-label={t(status)}>
      {STEPS.map((s, i) => (
        <div key={s} style={{ textAlign: 'center' }}>
          <div style={{ height: 6, borderRadius: 3, background: i <= idx ? 'var(--primary)' : '#e2e8f0' }} />
          <small style={{ fontSize: '.68rem', color: i <= idx ? 'var(--primary-dark)' : 'var(--muted)', fontWeight: i === idx ? 700 : 400 }}>{t(s)}</small>
        </div>
      ))}
    </div>
  );
}

export default function Requests() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('active');
  const [depts, setDepts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: REQUEST_TYPES[0], department: '', location: '', description: '', priority: 'Medium' });
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.get('/departments').then((r) => setDepts(r.data.items)).catch(() => {});
    if (user.role === 'admin') api.get('/users/staff-list').then((r) => setStaff(r.data.items)).catch(() => {});
  }, [user.role]);

  const load = useCallback(() => {
    api.get('/requests', { params: clean({ status, page, limit: 10 }) }).then((r) => setData(r.data)).catch((e) => toast.error(errMsg(e)));
  }, [status, page]);
  useEffect(() => { load(); }, [load]);
  useOnNotification(load);
  useEffect(() => { setPage(1); }, [status]);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/requests', clean(form));
      toast.success(t('Request submitted'));
      setOpen(false);
      setForm({ type: REQUEST_TYPES[0], department: '', location: '', description: '', priority: 'Medium' });
      setStatus('active');
      load();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const update = async (id, next) => {
    try { await api.put(`/requests/${id}/status`, { status: next }); toast.success(t('Done')); load(); } catch (e) { toast.error(errMsg(e)); }
  };
  const assign = async (id, staffId) => {
    if (!staffId) return;
    try { await api.put(`/requests/${id}/assign`, { staffId }); toast.success(t('Assigned')); load(); } catch (e) { toast.error(errMsg(e)); }
  };

  const nextActions = (r) => {
    if (user.role === 'patient') return r.status === 'Pending' || r.status === 'Accepted' ? [['Cancelled', 'Cancel request', 'btn-outline']] : [];
    if (r.status === 'Pending') return [['Accepted', 'Accept', 'btn-primary'], ['Cancelled', 'Cancel request', 'btn-outline']];
    if (r.status === 'Accepted') return [['In Progress', 'Start work', 'btn-primary']];
    if (r.status === 'In Progress') return [['Completed', 'Mark completed', 'btn-primary']];
    return [];
  };
  const staffCanAct = (r) => user.role !== 'staff' || !r.assignedTo || r.assignedTo._id === user._id;

  return (
    <>
      <PageHeader title="Service Requests" actions={user.role === 'patient' && <button className="btn btn-primary" onClick={() => setOpen(true)}><Icon name="plus" size={18} /> {t('New service request')}</button>} />
      <div className="tabs">
        {['active', ...REQUEST_STATUSES.filter((s) => s !== 'Cancelled'), 'Cancelled', ''].map((s) => (
          <button key={s || 'all'} className={`tab ${status === s ? 'active' : ''}`} onClick={() => setStatus(s)}>{s === '' ? t('All') : s === 'active' ? t('Active') : t(s)}</button>
        ))}
      </div>

      {!data ? <Loader /> : data.items.length === 0 ? (
        <Empty icon="concierge" title="No results found" action={user.role === 'patient' && <button className="btn btn-primary mt-s" onClick={() => setOpen(true)}>{t('New service request')}</button>} />
      ) : (
        <div className="list">
          {data.items.map((r) => (
            <div className="item" key={r._id}>
              <div className="item-top" onClick={() => setExpanded(expanded === r._id ? null : r._id)} style={{ cursor: 'pointer' }}>
                <div style={{ minWidth: 0 }}>
                  <div className="muted small">{r.requestId}</div>
                  <div className="item-title">{t(r.type)}</div>
                </div>
                <div className="badges"><Badge value={r.priority} /><Badge value={r.status} /></div>
              </div>
              <Tracker status={r.status} />
              <div className="item-meta">
                {r.location && <span>📍 {r.location}</span>}
                {r.department && <span>🏥 {r.department.name}</span>}
                {user.role !== 'patient' && r.patient && <span>🧑 {r.patient.name}{r.patient.phone ? ` · ${r.patient.phone}` : ''}</span>}
                <span>👤 {r.assignedTo ? r.assignedTo.name : t('Unassigned')}</span>
                <span>{fmtDate(r.createdAt, i18n.language)}</span>
              </div>
              {r.description && <p className="muted small mt-s">{r.description}</p>}
              {expanded === r._id && (
                <ul className="timeline mt">
                  {[...r.timeline].reverse().map((tl, i) => <li key={i}><b>{t(tl.status)}</b>{tl.note ? ` — ${tl.note}` : ''}<small>{tl.byName} · {fmtDate(tl.at, i18n.language)}</small></li>)}
                </ul>
              )}
              <div className="row mt-s">
                {staffCanAct(r) && nextActions(r).map(([s, label, cls]) => <button key={s} className={`btn btn-sm ${cls}`} onClick={() => update(r._id, s)}>{t(label)}</button>)}
                {user.role === 'admin' && ['Pending', 'Accepted', 'In Progress'].includes(r.status) && (
                  <select style={{ width: 'auto', minHeight: 36 }} value="" onChange={(e) => assign(r._id, e.target.value)} aria-label={t('Assign')}>
                    <option value="">{t('Assign')}…</option>
                    {staff.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(expanded === r._id ? null : r._id)}>{t('Track status')}</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}

      <Modal open={open} title="New service request" onClose={() => setOpen(false)}>
        <form onSubmit={create}>
          <Field label="Request type"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{REQUEST_TYPES.map((x) => <option key={x} value={x}>{t(x)}</option>)}</select></Field>
          <div className="form-grid">
            <Field label="Department"><select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}><option value="">—</option>{depts.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select></Field>
            <Field label="Priority"><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{PRIORITIES.map((p) => <option key={p} value={p}>{t(p)}</option>)}</select></Field>
          </div>
          <Field label="Ward / room / bed"><input type="text" maxLength={80} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
          <Field label="Description"><textarea maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? '...' : t('Submit request')}</button>
        </form>
      </Modal>
    </>
  );
}
