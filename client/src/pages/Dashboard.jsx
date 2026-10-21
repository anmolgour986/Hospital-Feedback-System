import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { useAuth } from '../context/AuthContext';
import { useOnNotification } from '../context/RealtimeContext';
import { Badge, Empty, Icon, Loader, StatCard, Stars } from '../components/ui';
import { ColumnBars, Donut, HBars, TrendChart } from '../components/Charts';
import { COLORS, STATUS_COLOR, fmtDate, hoursLabel } from '../constants';

const greet = (t) => { const h = new Date().getHours(); return h < 12 ? t('Good morning') : h < 17 ? t('Good afternoon') : t('Good evening'); };

function Recent({ title, items, render, to }) {
  const { t } = useTranslation();
  return (
    <div className="card">
      <div className="card-title"><h3>{t(title)}</h3><Link to={to} className="small">{t('View all')}</Link></div>
      {items === null ? <Loader /> : items.length === 0 ? <p className="muted">{t('Nothing here yet')}</p> : <div className="list">{items.map(render)}</div>}
    </div>
  );
}

/* ----------------------------- patient ----------------------------- */
function PatientDashboard() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [s, setS] = useState(null);
  const [complaints, setComplaints] = useState(null);
  const [reqs, setReqs] = useState(null);

  const load = useCallback(() => {
    Promise.all([api.get('/analytics/patient'), api.get('/complaints', { params: { limit: 4 } }), api.get('/requests', { params: { limit: 4 } })])
      .then(([a, c, r]) => { setS(a.data); setComplaints(c.data.items); setReqs(r.data.items); })
      .catch((e) => toast.error(errMsg(e)));
  }, []);
  useEffect(() => { load(); }, [load]);
  useOnNotification(load);

  if (!s) return <Loader />;
  return (
    <div className="stack">
      <div className="hero">
        <h1>{t('Hello')}, {user.name.split(' ')[0]} 👋</h1>
        <p>{t('Your health, your voice')}</p>
        <div className="action-tiles">
          <Link className="tile" to="/feedback/new"><Icon name="star" /> {t('Give Feedback')}</Link>
          <Link className="tile" to="/complaints/new"><Icon name="file" /> {t('Register a complaint')}</Link>
          <Link className="tile" to="/requests"><Icon name="concierge" /> {t('New service request')}</Link>
          <Link className="tile" to="/feedback"><Icon name="clock" /> {t('Feedback history')}</Link>
        </div>
      </div>
      <div className="stats">
        <StatCard label="Feedback given" value={s.feedbackCount} icon="star" tone="teal" />
        <StatCard label="Open complaints" value={s.complaintsOpen} icon="alert" tone="amber" />
        <StatCard label="Resolved complaints" value={s.complaintsResolved} icon="check" tone="green" />
        <StatCard label="Active requests" value={s.requestsActive} icon="concierge" tone="blue" />
      </div>
      <div className="grid grid-2">
        <Recent title="Recent complaints" to="/complaints" items={complaints} render={(c) => (
          <Link key={c._id} to={`/complaints/${c._id}`} className="item">
            <div className="item-top"><div className="item-title truncate">{c.title}</div><Badge value={c.status} /></div>
            <div className="item-meta"><span>{c.ticketId}</span><span>{fmtDate(c.createdAt, i18n.language)}</span></div>
          </Link>
        )} />
        <Recent title="Recent requests" to="/requests" items={reqs} render={(r) => (
          <Link key={r._id} to="/requests" className="item">
            <div className="item-top"><div className="item-title">{t(r.type)}</div><Badge value={r.status} /></div>
            <div className="item-meta"><span>{r.requestId}</span><span>{fmtDate(r.createdAt, i18n.language)}</span></div>
          </Link>
        )} />
      </div>
    </div>
  );
}

/* ----------------------------- staff ----------------------------- */
function StaffDashboard() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [s, setS] = useState(null);
  const [mine, setMine] = useState(null);
  const [open, setOpen] = useState(null);

  const load = useCallback(() => {
    Promise.all([
      api.get('/analytics/me'),
      api.get('/complaints', { params: { mine: true, status: 'active', sort: 'priority', limit: 5 } }),
      api.get('/complaints', { params: { assignedTo: 'none', status: 'Open', limit: 5 } }),
    ]).then(([a, m, o]) => { setS(a.data); setMine(m.data.items); setOpen(o.data.items); }).catch((e) => toast.error(errMsg(e)));
  }, []);
  useEffect(() => { load(); }, [load]);
  useOnNotification(load);

  if (!s) return <Loader />;
  const row = (c) => (
    <Link key={c._id} to={`/complaints/${c._id}`} className={`item ${c.escalated ? 'escalated' : ''}`}>
      <div className="item-top"><div className="item-title truncate">{c.title}</div><div className="badges"><Badge value={c.priority} /></div></div>
      <div className="item-meta"><span>{c.ticketId}</span><span>{c.department ? c.department.name : ''}</span><span>{fmtDate(c.createdAt, i18n.language)}</span></div>
    </Link>
  );
  return (
    <div className="stack">
      <div className="hero">
        <h1>{greet(t)}, {user.name.split(' ').slice(0, 2).join(' ')}</h1>
        <p>{user.designation || t('Staff')}{user.department ? ` · ${user.department.name}` : ''}</p>
      </div>
      <div className="stats">
        <StatCard label="My assigned complaints" value={s.pendingAssigned} icon="file" tone="amber" />
        <StatCard label="Unassigned in my department" value={s.unassignedInDepartment} icon="alert" tone="red" />
        <StatCard label="Pending requests" value={s.pendingRequests} icon="concierge" tone="blue" />
        <StatCard label="My rating" value={s.avgRating ? `${s.avgRating} ★` : '—'} hint={`${s.feedbackCount} ${t('Ratings')}`} icon="star" tone="teal" />
        <StatCard label="Resolution rate" value={`${s.resolutionRate}%`} hint={`${s.complaintsResolved}/${s.complaintsAssigned}`} icon="check" tone="green" />
        <StatCard label="Avg resolution time" value={hoursLabel(s.avgResolutionHours)} icon="clock" tone="purple" />
      </div>
      <div className="grid grid-2">
        <Recent title="My assigned complaints" to="/complaints?mine=true" items={mine} render={row} />
        <Recent title="Unassigned in my department" to="/complaints" items={open} render={row} />
      </div>
    </div>
  );
}

/* ----------------------------- admin ----------------------------- */
function AdminDashboard() {
  const { t } = useTranslation();
  const [days, setDays] = useState(30);
  const [o, setO] = useState(null);
  const [trend, setTrend] = useState(null);
  const [depts, setDepts] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      api.get('/analytics/overview', { params: { days } }),
      api.get('/analytics/trends', { params: { days, granularity: days > 90 ? 'week' : 'day' } }),
      api.get('/analytics/departments', { params: { days } }),
    ]).then(([a, b, c]) => { setO(a.data); setTrend(b.data.items); setDepts(c.data.items); }).catch((e) => toast.error(errMsg(e)));
  }, [days]);
  useEffect(() => { load(); }, [load]);
  useOnNotification(load);

  const runEscalation = async () => {
    setBusy(true);
    try { const r = await api.post('/complaints/escalate/run'); toast.success(r.data.message); load(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  if (!o) return <Loader />;
  const c = o.complaints; const f = o.feedback;
  const attention = c.overdue + c.urgentOpen;
  return (
    <div className="stack">
      <div className="row between">
        <h1>{t('Dashboard')}</h1>
        <select style={{ width: 'auto' }} value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Period">
          <option value={7}>{t('Last 7 days')}</option><option value={30}>{t('Last 30 days')}</option><option value={90}>{t('Last 90 days')}</option><option value={365}>{t('Last year')}</option>
        </select>
      </div>

      {attention > 0 && (
        <div className="alert danger row between">
          <span>🚨 <b>{t('Attention needed')}:</b> {c.overdue} {t('Overdue')} · {c.urgentOpen} {t('Urgent open')}</span>
          <div className="row"><Link to="/complaints?overdue=true" className="btn btn-sm btn-outline">{t('View')}</Link><button className="btn btn-sm btn-danger" disabled={busy} onClick={runEscalation}>{t('Run escalation check now')}</button></div>
        </div>
      )}

      <div className="stats">
        <StatCard label="Satisfaction score" value={`${f.satisfactionScore}%`} hint="4–5 ★" icon="award" tone="green" />
        <StatCard label="Average rating" value={`${f.avgRating} ★`} hint={`${f.total} ${t('Total feedback')}`} icon="star" tone="teal" />
        <StatCard label="Total complaints" value={c.total} hint={`${c.open} ${t('Open')} · ${c.resolved} ${t('Resolved')}`} icon="file" tone="blue" />
        <StatCard label="Avg resolution time" value={hoursLabel(c.avgResolutionHours)} icon="clock" tone="purple" />
        <StatCard label="Escalated" value={c.escalated} icon="alert" tone="red" />
        <StatCard label="Pending requests" value={o.requests.pending} icon="concierge" tone="amber" />
        <StatCard label="Users" value={o.users ? o.users.patients + o.users.staff : 0} hint={o.users ? `${o.users.patients} ${t('Patient')} · ${o.users.staff} ${t('Staff')}` : ''} icon="users" tone="teal" />
      </div>

      <div className="card">
        <div className="card-title"><h3>{t('Feedback trend')}</h3></div>
        <TrendChart data={trend} lines={[{ key: 'feedback', name: 'Feedback received' }, { key: 'complaints', name: 'Complaints raised' }, { key: 'resolved', name: 'Complaints resolved' }]} />
      </div>

      <div className="grid grid-2">
        <div className="card"><div className="card-title"><h3>{t('Complaints by status')}</h3></div><Donut data={c.byStatus} /></div>
        <div className="card"><div className="card-title"><h3>{t('Sentiment analysis')}</h3></div>
          <Donut data={[{ name: 'positive', value: f.sentiment.positive }, { name: 'neutral', value: f.sentiment.neutral }, { name: 'negative', value: f.sentiment.negative }]} colors={{ positive: COLORS.green, neutral: COLORS.slate, negative: COLORS.red }} />
        </div>
        <div className="card"><div className="card-title"><h3>{t('Complaints by priority')}</h3></div><ColumnBars data={c.byPriority} colors={{ Low: STATUS_COLOR.Low, Medium: STATUS_COLOR.Medium, High: STATUS_COLOR.High, Urgent: STATUS_COLOR.Urgent }} /></div>
        <div className="card"><div className="card-title"><h3>{t('Department ratings')}</h3></div>
          <HBars data={(depts || []).filter((d) => d.feedbackCount > 0).sort((a, b) => b.avgRating - a.avgRating).map((d) => ({ name: d.name, value: d.avgRating }))} max={5} format={(v) => Number(v).toFixed(1)} />
        </div>
      </div>
      <div className="card"><div className="card-title"><h3>{t('Complaints by category')}</h3></div><HBars data={c.byCategory} /></div>
      <p className="muted small center">{t('Rating distribution')}: {f.distribution.map((d) => `${d.rating}★ ${d.count}`).join(' · ')} <Stars value={f.avgRating} size={12} /></p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  if (user.role === 'admin') return <AdminDashboard />;
  if (user.role === 'staff') return <StaffDashboard />;
  return <PatientDashboard />;
}
