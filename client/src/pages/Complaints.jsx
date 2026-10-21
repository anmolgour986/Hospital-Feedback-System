import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { useAuth } from '../context/AuthContext';
import { useOnNotification } from '../context/RealtimeContext';
import { useDebounce, clean } from '../hooks';
import { Badge, Empty, Icon, Loader, PageHeader, Pagination } from '../components/ui';
import { CATEGORIES, COMPLAINT_STATUSES, PRIORITIES, fmtDate } from '../constants';

export function dueLabel(c, t) {
  if (!c.dueAt || ['Resolved', 'Closed'].includes(c.status)) return null;
  const diff = new Date(c.dueAt) - Date.now();
  const abs = Math.abs(diff) / 36e5;
  const txt = abs < 1 ? `${Math.max(1, Math.round(abs * 60))}m` : abs < 48 ? `${Math.round(abs)}h` : `${Math.round(abs / 24)}d`;
  return diff < 0 ? { late: true, text: t('Overdue by {{h}}', { h: txt }) } : { late: false, text: t('Due in {{h}}', { h: txt }) };
}

export default function Complaints() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [depts, setDepts] = useState([]);
  const [page, setPage] = useState(1);
  const [f, setF] = useState({ q: '', status: '', priority: '', category: '', department: '', escalated: false, overdue: false, mine: false, sort: 'newest' });
  const [showFilters, setShowFilters] = useState(false);
  const q = useDebounce(f.q);

  useEffect(() => { api.get('/departments').then((r) => setDepts(r.data.items)).catch(() => {}); }, []);

  const load = useCallback(() => {
    api.get('/complaints', { params: clean({ ...f, q, page, limit: 10 }) })
      .then((r) => setData(r.data))
      .catch((e) => toast.error(errMsg(e)));
  }, [f.status, f.priority, f.category, f.department, f.escalated, f.overdue, f.mine, f.sort, q, page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  useOnNotification(load);
  useEffect(() => { setPage(1); }, [f.status, f.priority, f.category, f.department, f.escalated, f.overdue, f.mine, f.sort, q]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const reset = () => setF({ q: '', status: '', priority: '', category: '', department: '', escalated: false, overdue: false, mine: false, sort: 'newest' });
  const activeFilters = ['status', 'priority', 'category', 'department'].some((k) => f[k]) || f.escalated || f.overdue || f.mine;

  return (
    <>
      <PageHeader title="Complaints" actions={user.role === 'patient' && <Link to="/complaints/new" className="btn btn-primary"><Icon name="plus" size={18} /> {t('New complaint')}</Link>} />
      <div className="toolbar">
        <div className="search"><Icon name="search" size={18} /><input type="search" placeholder={t('Search by title, ticket or text')} value={f.q} onChange={set('q')} /></div>
        <button className="btn btn-outline filter-toggle" onClick={() => setShowFilters(!showFilters)}><Icon name="filter" size={18} /> {t('Filters')}{activeFilters ? ' •' : ''}</button>
      </div>
      <div className={`filters ${showFilters ? 'show' : ''}`}>
        <select value={f.status} onChange={set('status')} aria-label={t('Status')}>
          <option value="">{t('All statuses')}</option><option value="active">{t('Active')}</option>
          {COMPLAINT_STATUSES.map((s) => <option key={s} value={s}>{t(s)}</option>)}
        </select>
        <select value={f.priority} onChange={set('priority')} aria-label={t('Priority')}><option value="">{t('All priorities')}</option>{PRIORITIES.map((s) => <option key={s} value={s}>{t(s)}</option>)}</select>
        <select value={f.category} onChange={set('category')} aria-label={t('Category')}><option value="">{t('All categories')}</option>{CATEGORIES.map((s) => <option key={s} value={s}>{t(s)}</option>)}</select>
        <select value={f.department} onChange={set('department')} aria-label={t('Department')}><option value="">{t('All departments')}</option>{depts.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select>
        <select value={f.sort} onChange={set('sort')} aria-label="Sort">
          <option value="newest">{t('Newest first')}</option><option value="oldest">{t('Oldest first')}</option><option value="priority">{t('By priority')}</option><option value="due">{t('Due soonest')}</option>
        </select>
        {user.role !== 'patient' && <label className="check" style={{ margin: 0, alignItems: 'center' }}><input type="checkbox" checked={f.escalated} onChange={set('escalated')} /> {t('Only escalated')}</label>}
        {user.role !== 'patient' && <label className="check" style={{ margin: 0, alignItems: 'center' }}><input type="checkbox" checked={f.overdue} onChange={set('overdue')} /> {t('Only overdue')}</label>}
        {user.role === 'staff' && <label className="check" style={{ margin: 0, alignItems: 'center' }}><input type="checkbox" checked={f.mine} onChange={set('mine')} /> {t('Assigned to me')}</label>}
        {activeFilters && <button className="btn btn-ghost btn-sm" onClick={reset}>{t('Clear filters')}</button>}
      </div>

      {!data ? <Loader /> : data.items.length === 0 ? (
        <Empty title="No results found" action={user.role === 'patient' && <Link to="/complaints/new" className="btn btn-primary mt-s">{t('New complaint')}</Link>} />
      ) : (
        <div className="list">
          {data.items.map((c) => {
            const due = dueLabel(c, t);
            return (
              <Link to={`/complaints/${c._id}`} key={c._id} className={`item ${c.escalated ? 'escalated' : ''}`}>
                <div className="item-top">
                  <div style={{ minWidth: 0 }}>
                    <div className="muted small">{c.ticketId}</div>
                    <div className="item-title">{c.title}</div>
                  </div>
                  <div className="badges"><Badge value={c.priority} /><Badge value={c.status} /></div>
                </div>
                <div className="item-meta">
                  <span>🏥 {c.department ? c.department.name : '—'}</span>
                  <span>🏷️ {t(c.category)}</span>
                  <span>👤 {c.assignedTo ? c.assignedTo.name : t('Unassigned')}</span>
                  {c.escalated && <span style={{ color: 'var(--danger)', fontWeight: 600 }}>⚠ {t('Escalated')}</span>}
                  {due && <span style={{ color: due.late ? 'var(--danger)' : undefined, fontWeight: due.late ? 600 : 400 }}>⏱ {due.text}</span>}
                  <span>{fmtDate(c.createdAt, i18n.language)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </>
  );
}
