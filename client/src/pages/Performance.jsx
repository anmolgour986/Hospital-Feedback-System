import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { Empty, Loader, PageHeader, Stars } from '../components/ui';
import { HBars } from '../components/Charts';
import { COLORS, hoursLabel } from '../constants';
import { RANGES } from './Analytics';

export default function Performance() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('departments');
  const [days, setDays] = useState(90);
  const [depts, setDepts] = useState(null);
  const [staff, setStaff] = useState(null);

  useEffect(() => {
    let off = false;
    setDepts(null);
    setStaff(null);
    Promise.all([api.get('/analytics/departments', { params: { days } }), api.get('/analytics/staff', { params: { days } })])
      .then(([a, b]) => { if (!off) { setDepts(a.data.items); setStaff(b.data.items); } })
      .catch((e) => { if (!off) toast.error(errMsg(e)); });
    return () => { off = true; };
  }, [days]);

  return (
    <div className="stack">
      <PageHeader
        title="Performance"
        actions={(
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label={t('Period')}>
            {RANGES.map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}
          </select>
        )}
      />
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'departments'} className={`tab ${tab === 'departments' ? 'active' : ''}`} onClick={() => setTab('departments')}>{t('Department performance')}</button>
        <button role="tab" aria-selected={tab === 'staff'} className={`tab ${tab === 'staff' ? 'active' : ''}`} onClick={() => setTab('staff')}>{t('Staff performance')}</button>
      </div>

      {!depts || !staff ? <Loader /> : tab === 'departments' ? (
        <>
          <div className="card">
            <div className="card-title"><h3>{t('Department ratings')}</h3></div>
            <HBars data={depts.filter((d) => d.feedbackCount).map((d) => ({ name: d.name, value: d.avgRating })).sort((a, b) => b.value - a.value)} max={5} color={COLORS.teal} />
          </div>
          <div className="card">
            {depts.length === 0 ? <Empty title="No results found" /> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>{t('Department')}</th><th>{t('Feedback')}</th><th>{t('Avg rating')}</th><th>{t('Satisfaction score')}</th><th>{t('Negative')}</th><th>{t('Complaints')}</th><th>{t('Resolved')}</th><th>{t('Escalated')}</th><th>{t('Avg resolution time')}</th></tr></thead>
                  <tbody>
                    {depts.map((d) => (
                      <tr key={d._id}>
                        <td><strong>{d.name}</strong></td>
                        <td>{d.feedbackCount}</td>
                        <td>{d.feedbackCount ? <span className="nowrap"><Stars value={d.avgRating} size={13} /> {d.avgRating}</span> : '—'}</td>
                        <td>{d.feedbackCount ? `${d.satisfactionScore}%` : '—'}</td>
                        <td>{d.negativeFeedback}</td>
                        <td>{d.complaints}</td>
                        <td>{d.resolved}</td>
                        <td>{d.escalated}</td>
                        <td>{hoursLabel(d.avgResolutionHours)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="card">
            <div className="card-title"><h3>{t('Doctors & staff')}</h3></div>
            <HBars data={staff.filter((s) => s.feedbackCount).slice(0, 12).map((s) => ({ name: s.name, value: s.avgRating }))} max={5} color={COLORS.blue} />
          </div>
          <div className="card">
            {staff.length === 0 ? <Empty title="No results found" /> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>{t('Name')}</th><th>{t('Department')}</th><th>{t('Ratings')}</th><th>{t('Avg rating')}</th><th>{t('Assigned complaints')}</th><th>{t('Resolved')}</th><th>{t('Resolution rate')}</th><th>{t('Avg resolution time')}</th></tr></thead>
                  <tbody>
                    {staff.map((s) => (
                      <tr key={s._id}>
                        <td><strong>{s.name}</strong><div className="muted small">{s.designation || (s.isDoctor ? t('Doctor') : '')}</div></td>
                        <td>{s.department}</td>
                        <td>{s.feedbackCount}</td>
                        <td>{s.feedbackCount ? <span className="nowrap"><Stars value={s.avgRating} size={13} /> {s.avgRating}</span> : '—'}</td>
                        <td>{s.assigned}</td>
                        <td>{s.resolved}</td>
                        <td>{s.assigned ? `${s.resolutionRate}%` : '—'}</td>
                        <td>{hoursLabel(s.avgResolutionHours)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
