import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { useAuth } from '../context/AuthContext';
import { useOnNotification } from '../context/RealtimeContext';
import { Badge, Empty, Icon, Loader, StarInput, Stars } from '../components/ui';
import { COMPLAINT_STATUSES, PRIORITIES, fmtDate, hoursLabel } from '../constants';
import { dueLabel } from './Complaints';

export default function ComplaintDetail() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [c, setC] = useState(null);
  const [error, setError] = useState('');
  const [staff, setStaff] = useState([]);
  const [assignTo, setAssignTo] = useState('');
  const [msg, setMsg] = useState('');
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingText, setRatingText] = useState('');

  const load = useCallback(() => {
    api.get(`/complaints/${id}`).then((r) => setC(r.data.complaint)).catch((e) => setError(errMsg(e)));
  }, [id]);
  useEffect(() => { load(); }, [load]);
  useOnNotification((n) => { if (n && n.link && n.link.includes(id)) load(); });

  useEffect(() => {
    if (user.role === 'admin') api.get('/users/staff-list').then((r) => setStaff(r.data.items)).catch(() => {});
  }, [user.role]);

  const act = async (fn, okMsg) => {
    setBusy(true);
    try {
      const r = await fn();
      setC(r.data.complaint);
      if (okMsg) toast.success(t(okMsg));
      return true;
    } catch (e) {
      toast.error(errMsg(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (error) return <Empty icon="alert" title={error} action={<Link to="/complaints" className="btn btn-outline mt-s">{t('Back')}</Link>} />;
  if (!c) return <Loader />;

  const isPatient = user.role === 'patient';
  const isAdmin = user.role === 'admin';
  const mine = c.assignedTo && c.assignedTo._id === user._id;
  const canManage = isAdmin || (user.role === 'staff' && mine);
  const canClaim = user.role === 'staff' && !c.assignedTo && !['Resolved', 'Closed'].includes(c.status);
  const finished = ['Resolved', 'Closed'].includes(c.status);
  const due = dueLabel(c, t);

  const setStatus = (status) => act(() => api.put(`/complaints/${id}/status`, { status }), 'Done');
  const send = async (e) => {
    e.preventDefault();
    if (!msg.trim()) return;
    const ok = await act(() => api.post(`/complaints/${id}/respond`, { message: msg.trim(), internal }));
    if (ok) { setMsg(''); setInternal(false); }
  };
  const sortedStaff = [...staff].sort((a, b) => (String(b.department && b.department._id) === String(c.department && c.department._id)) - (String(a.department && a.department._id) === String(c.department && c.department._id)));

  return (
    <div className="stack">
      <Link to="/complaints" className="muted small">← {t('Complaints')}</Link>

      <div className="card">
        <div className="item-top">
          <div style={{ minWidth: 0 }}>
            <div className="muted small">{c.ticketId}</div>
            <h1 style={{ fontSize: '1.25rem', wordBreak: 'break-word' }}>{c.title}</h1>
          </div>
          <div className="badges"><Badge value={c.priority} /><Badge value={c.status} />{c.escalated && <Badge tone="red">{t('Escalated')} ×{c.escalationLevel}</Badge>}</div>
        </div>
        <p className="mt" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.description}</p>
        <dl className="kv mt">
          <div><dt>{t('Department')}</dt><dd>{c.department ? c.department.name : '—'}</dd></div>
          <div><dt>{t('Category')}</dt><dd>{t(c.category)}</dd></div>
          <div><dt>{t('Assigned to')}</dt><dd>{c.assignedTo ? c.assignedTo.name : t('Unassigned')}</dd></div>
          <div><dt>{t('Created')}</dt><dd>{fmtDate(c.createdAt, i18n.language)}</dd></div>
          {!isPatient && <div><dt>{t('Patient')}</dt><dd>{c.patient ? c.patient.name : t('Anonymous')}</dd></div>}
          {c.sentiment && !isPatient && <div><dt>{t('Sentiment analysis')}</dt><dd><Badge value={c.sentiment.label} /></dd></div>}
          {due && <div><dt>{t('Due')}</dt><dd style={{ color: due.late ? 'var(--danger)' : undefined }}>{due.text}</dd></div>}
          {c.resolutionTimeHours != null && <div><dt>{t('Resolution time')}</dt><dd>{hoursLabel(c.resolutionTimeHours)}</dd></div>}
          {c.isAnonymous && isPatient && <div><dt>&nbsp;</dt><dd>🕶️ {t('Submitted anonymously')}</dd></div>}
        </dl>
      </div>

      {(isAdmin || canClaim || canManage) && !finished && (
        <div className="card">
          <h3 className="mb">{t('Actions')}</h3>
          <div className="grid grid-2">
            {isAdmin && (
              <div>
                <span className="field-label">{t('Assign to staff')}</span>
                <div className="row" style={{ flexWrap: 'nowrap' }}>
                  <select className="grow" value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
                    <option value="">—</option>
                    {sortedStaff.map((s) => <option key={s._id} value={s._id}>{s.name}{s.department ? ` (${s.department.name})` : ''}</option>)}
                  </select>
                  <button className="btn btn-primary" disabled={!assignTo || busy} onClick={() => act(() => api.put(`/complaints/${id}/assign`, { staffId: assignTo }), 'Assigned')}>{t('Assign')}</button>
                </div>
              </div>
            )}
            {canClaim && <div><button className="btn btn-primary btn-block" disabled={busy} onClick={() => act(() => api.put(`/complaints/${id}/claim`), 'Done')}>{t('Claim this complaint')}</button></div>}
            {canManage && (
              <>
                <div>
                  <span className="field-label">{t('Update status')}</span>
                  <select value={c.status} disabled={busy} onChange={(e) => setStatus(e.target.value)}>
                    {COMPLAINT_STATUSES.filter((s) => s !== 'Open' || c.status === 'Open').map((s) => <option key={s} value={s}>{t(s)}</option>)}
                  </select>
                </div>
                <div>
                  <span className="field-label">{t('Change priority')}</span>
                  <select value={c.priority} disabled={busy} onChange={(e) => act(() => api.put(`/complaints/${id}/priority`, { priority: e.target.value }), 'Done')}>
                    {PRIORITIES.map((s) => <option key={s} value={s}>{t(s)}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {canManage && finished && c.status === 'Resolved' && (
        <div className="card row between"><span className="muted">{t('Resolved')}</span><button className="btn btn-outline btn-sm" onClick={() => setStatus('In Progress')} disabled={busy}>{t('Reopen')}</button></div>
      )}

      {isPatient && c.status === 'Resolved' && (
        <div className="card">
          <div className="alert ok mb">✅ {t('Resolved')}</div>
          <div className="row">
            <button className="btn btn-primary" disabled={busy} onClick={() => setStatus('Closed')}>{t('Close complaint')}</button>
            <button className="btn btn-outline" disabled={busy} onClick={() => setStatus('Open')}>{t('Reopen')}</button>
          </div>
        </div>
      )}
      {isPatient && c.status === 'Closed' && (
        <div className="card row between"><span className="muted">{t('Closed')}</span><button className="btn btn-outline btn-sm" disabled={busy} onClick={() => setStatus('Open')}>{t('Reopen')}</button></div>
      )}

      {isPatient && finished && (
        <div className="card">
          <h3 className="mb">{t('Rate the resolution')}</h3>
          {c.resolutionRating ? (
            <div className="row"><Stars value={c.resolutionRating} size={22} /><span className="muted">{t('Thanks for rating')}</span></div>
          ) : (
            <>
              <StarInput value={rating} onChange={setRating} label={t('Rate the resolution')} />
              <textarea className="mt-s" style={{ minHeight: 70 }} maxLength={500} value={ratingText} onChange={(e) => setRatingText(e.target.value)} placeholder={t('Optional')} />
              <button className="btn btn-primary mt-s" disabled={!rating || busy} onClick={() => act(() => api.put(`/complaints/${id}/rate`, { rating, feedback: ratingText.trim() || undefined }), 'Thanks for rating')}>{t('Submit')}</button>
            </>
          )}
        </div>
      )}

      <div className="card">
        <h3 className="mb">{t('Conversation')}</h3>
        <div className="chat">
          {c.responses.length === 0 && <p className="muted">—</p>}
          {c.responses.map((r) => (
            <div key={r._id} className={`bubble ${r.author === user._id ? 'mine' : ''} ${r.internal ? 'internal' : ''}`}>
              <small>{r.authorName}{r.authorRole ? ` · ${t(r.authorRole)}` : ''}{r.internal ? ` · ${t('Internal')}` : ''} · {fmtDate(r.createdAt, i18n.language)}</small>
              {r.message}
            </div>
          ))}
        </div>
        {c.status !== 'Closed' && (!(user.role === 'staff') || canManage || !c.assignedTo) && (
          <form onSubmit={send} className="mt">
            <textarea style={{ minHeight: 80 }} maxLength={2000} placeholder={t('Write a message...')} value={msg} onChange={(e) => setMsg(e.target.value)} />
            {!isPatient && <label className="check mt-s"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /><span>{t('Internal note (not visible to patient)')}</span></label>}
            <button className="btn btn-primary mt-s" disabled={!msg.trim() || busy}><Icon name="send" size={18} /> {t('Send')}</button>
          </form>
        )}
      </div>

      <div className="card">
        <h3 className="mb">{t('Timeline')}</h3>
        <ul className="timeline">
          {[...c.timeline].reverse().map((tl, i) => (
            <li key={i}><b>{tl.action}</b>{tl.note ? ` — ${tl.note}` : ''}<small>{tl.byName || 'System'} · {fmtDate(tl.at, i18n.language)}</small></li>
          ))}
        </ul>
      </div>
    </div>
  );
}
