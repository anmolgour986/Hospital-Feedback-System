import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { useAuth } from '../context/AuthContext';
import { useOnNotification } from '../context/RealtimeContext';
import { useDebounce, clean } from '../hooks';
import { Badge, Empty, Icon, Loader, PageHeader, Pagination, Stars } from '../components/ui';
import { fmtDate } from '../constants';

export default function FeedbackList() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isPatient = user.role === 'patient';
  const [data, setData] = useState(null);
  const [depts, setDepts] = useState([]);
  const [page, setPage] = useState(1);
  const [f, setF] = useState({ q: '', department: '', rating: '', sentiment: '', source: '' });
  const [showFilters, setShowFilters] = useState(false);
  const q = useDebounce(f.q);

  useEffect(() => { api.get('/departments').then((r) => setDepts(r.data.items)).catch(() => {}); }, []);

  const load = useCallback(() => {
    api.get('/feedback', { params: clean({ ...f, q, page, limit: 10 }) })
      .then((r) => setData(r.data))
      .catch((e) => toast.error(errMsg(e)));
  }, [f.department, f.rating, f.sentiment, f.source, q, page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  useOnNotification(load);
  useEffect(() => { setPage(1); }, [f.department, f.rating, f.sentiment, f.source, q]);

  const remove = async (id) => {
    if (!window.confirm(t('Delete this feedback?'))) return;
    try { await api.delete(`/feedback/${id}`); toast.success(t('Done')); load(); } catch (e) { toast.error(errMsg(e)); }
  };

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <>
      <PageHeader title={isPatient ? 'Feedback history' : 'Feedback'} actions={isPatient && <Link to="/feedback/new" className="btn btn-primary"><Icon name="plus" size={18} /> {t('Give Feedback')}</Link>} />
      <div className="toolbar">
        <div className="search"><Icon name="search" size={18} /><input type="search" placeholder={t('Search comments')} value={f.q} onChange={set('q')} /></div>
        <button className="btn btn-outline filter-toggle" onClick={() => setShowFilters(!showFilters)}><Icon name="filter" size={18} /> {t('Filters')}</button>
      </div>
      <div className={`filters ${showFilters ? 'show' : ''}`}>
        <select value={f.department} onChange={set('department')} aria-label={t('Department')}><option value="">{t('All departments')}</option>{depts.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select>
        <select value={f.rating} onChange={set('rating')} aria-label="Rating"><option value="">{t('All ratings')}</option>{[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{'★'.repeat(r)}</option>)}</select>
        <select value={f.sentiment} onChange={set('sentiment')} aria-label="Sentiment"><option value="">{t('All sentiments')}</option>{['positive', 'neutral', 'negative'].map((s) => <option key={s} value={s}>{t(s)}</option>)}</select>
        {!isPatient && <select value={f.source} onChange={set('source')} aria-label="Source"><option value="">{t('All')}</option><option value="web">Web</option><option value="qr">QR</option></select>}
      </div>

      {!data ? <Loader /> : data.items.length === 0 ? (
        <Empty icon="star" title="No results found" action={isPatient && <Link to="/feedback/new" className="btn btn-primary mt-s">{t('Give Feedback')}</Link>} />
      ) : (
        <div className="list">
          {data.items.map((fb) => (
            <div className="item" key={fb._id}>
              <div className="item-top">
                <div>
                  <div className="item-title">{fb.department ? fb.department.name : '—'}{fb.visitType ? <span className="muted small"> · {fb.visitType}</span> : null}</div>
                  <div className="row" style={{ gap: 8, marginTop: 4 }}><Stars value={fb.rating} /><b>{fb.rating}.0</b></div>
                </div>
                <div className="badges">
                  {fb.sentiment && <Badge value={fb.sentiment.label} />}
                  {fb.source === 'qr' && <Badge tone="teal">{t('Via QR')}</Badge>}
                </div>
              </div>
              {fb.comment && <p style={{ marginTop: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{fb.comment}</p>}
              <div className="item-meta">
                {fb.staffMember && <span>👤 {fb.staffMember.name}{fb.staffRating ? <> · <Stars value={fb.staffRating} size={12} /></> : null}</span>}
                <span>{fb.isAnonymous && (isPatient || !fb.patient) ? `🕶️ ${t('Anonymous')}` : fb.patient ? `${fb.patient.name}` : `🕶️ ${t('Anonymous')}`}</span>
                <span>{fmtDate(fb.createdAt, i18n.language)}</span>
                {user.role === 'admin' && <button className="btn btn-ghost btn-sm" onClick={() => remove(fb._id)} aria-label={t('Delete')}><Icon name="trash" size={16} /></button>}
              </div>
            </div>
          ))}
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </>
  );
}
