import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { useAuth } from '../context/AuthContext';
import { clean } from '../hooks';
import { Loader, PageHeader, StatCard } from '../components/ui';
import { ColumnBars, Donut, HBars, TrendChart } from '../components/Charts';
import { COLORS, hoursLabel } from '../constants';

export const RANGES = [[7, 'Last 7 days'], [30, 'Last 30 days'], [90, 'Last 90 days'], [365, 'Last year']];

export default function Analytics() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [days, setDays] = useState(30);
  const [gran, setGran] = useState('day');
  const [dept, setDept] = useState('');
  const [depts, setDepts] = useState([]);
  const [ov, setOv] = useState(null);
  const [trend, setTrend] = useState(null);
  const [dp, setDp] = useState(null);

  useEffect(() => {
    if (user.role === 'admin') api.get('/departments').then((r) => setDepts(r.data.items)).catch(() => {});
  }, [user.role]);

  useEffect(() => {
    let off = false;
    setOv(null);
    const params = clean({ days, department: dept });
    Promise.all([
      api.get('/analytics/overview', { params }),
      api.get('/analytics/trends', { params: { ...params, granularity: gran } }),
      api.get('/analytics/departments', { params: { days } }),
    ])
      .then(([a, b, c]) => { if (!off) { setOv(a.data); setTrend(b.data.items); setDp(c.data.items); } })
      .catch((e) => { if (!off) toast.error(errMsg(e)); });
    return () => { off = true; };
  }, [days, gran, dept]);

  const header = (
    <PageHeader
      title="Analytics"
      actions={(
        <div className="row">
          {user.role === 'admin' && (
            <select value={dept} onChange={(e) => setDept(e.target.value)} aria-label={t('Department')}>
              <option value="">{t('All departments')}</option>
              {depts.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          )}
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label={t('Period')}>
            {RANGES.map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}
          </select>
          <select value={gran} onChange={(e) => setGran(e.target.value)} aria-label={t('Granularity')}>
            <option value="day">{t('Daily')}</option><option value="week">{t('Weekly')}</option><option value="month">{t('Monthly')}</option>
          </select>
        </div>
      )}
    />
  );

  if (!ov) return <>{header}<Loader /></>;
  const { feedback: f, complaints: c } = ov;
  const ratingTrend = (trend || []).map((i) => ({ ...i, avgRating: i.feedback ? i.avgRating : null }));
  const deptRatings = (dp || []).filter((d) => d.feedbackCount > 0).map((d) => ({ name: d.name, value: d.avgRating })).sort((a, b) => b.value - a.value);

  return (
    <div className="stack">
      {header}
      <div className="stats">
        <StatCard label="Satisfaction score" value={`${f.satisfactionScore}%`} hint={t('% of 4-5 star ratings')} icon="award" tone="teal" />
        <StatCard label="Average rating" value={`${f.avgRating} / 5`} icon="star" tone="amber" />
        <StatCard label="Total feedback" value={f.total} icon="chart" tone="blue" />
        <StatCard label="Avg resolution time" value={hoursLabel(c.avgResolutionHours)} hint={c.resolutionRatingCount ? `${t('Resolution rating')}: ${c.resolutionRating}★` : undefined} icon="clock" tone="green" />
      </div>

      <div className="card">
        <div className="card-title"><h3>{t('Feedback trend')}</h3></div>
        <TrendChart data={trend} lines={[
          { key: 'feedback', name: 'Feedback received' },
          { key: 'complaints', name: 'Complaints raised' },
          { key: 'resolved', name: 'Complaints resolved' },
        ]} tall />
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-title"><h3>{t('Average rating over time')}</h3></div>
          <TrendChart data={ratingTrend} domain={[0, 5]} lines={[{ key: 'avgRating', name: 'Avg rating', color: COLORS.amber }]} />
        </div>
        <div className="card">
          <div className="card-title"><h3>{t('Sentiment analysis')}</h3></div>
          <Donut data={['positive', 'neutral', 'negative'].map((k) => ({ name: k, value: f.sentiment[k] }))} />
        </div>
        <div className="card">
          <div className="card-title"><h3>{t('Rating distribution')}</h3></div>
          <ColumnBars data={f.distribution.map((d) => ({ name: `${d.rating}★`, value: d.count }))} color={COLORS.amber} />
        </div>
        <div className="card">
          <div className="card-title"><h3>{t('Complaints by priority')}</h3></div>
          <ColumnBars data={c.byPriority} />
        </div>
        <div className="card">
          <div className="card-title"><h3>{t('Complaints by category')}</h3></div>
          <HBars data={c.byCategory} />
        </div>
        <div className="card">
          <div className="card-title"><h3>{t('Complaints by status')}</h3></div>
          <Donut data={c.byStatus} />
        </div>
      </div>

      {user.role === 'admin' && !dept && (
        <div className="card">
          <div className="card-title"><h3>{t('Department ratings')}</h3></div>
          <HBars data={deptRatings} max={5} />
        </div>
      )}

      <div className="card">
        <div className="card-title"><h3>{t('Complaint resolution time')}</h3></div>
        <dl className="kv">
          <div><dt>{t('Average')}</dt><dd>{hoursLabel(c.avgResolutionHours)}</dd></div>
          <div><dt>{t('Fastest')}</dt><dd>{hoursLabel(c.minResolutionHours)}</dd></div>
          <div><dt>{t('Slowest')}</dt><dd>{hoursLabel(c.maxResolutionHours)}</dd></div>
          <div><dt>{t('Overdue')}</dt><dd>{c.overdue}</dd></div>
        </dl>
      </div>
    </div>
  );
}
