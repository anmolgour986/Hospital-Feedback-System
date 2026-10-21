import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { Field, Icon, PageHeader } from '../components/ui';
import { clean } from '../hooks';

const REPORTS = [
  { type: 'summary', title: 'Summary report', desc: 'Satisfaction score, complaints, categories, priorities and service requests.', icon: 'chart' },
  { type: 'departments', title: 'Department performance', desc: 'Ratings, complaints, escalations and resolution time for every department.', icon: 'building' },
  { type: 'staff', title: 'Staff performance', desc: 'Doctor and staff ratings, assigned complaints and resolution rates.', icon: 'award' },
  { type: 'complaints', title: 'Complaint register', desc: 'The latest 300 complaints with priority, status, assignee and resolution time.', icon: 'file' },
];

export default function Reports() {
  const { t } = useTranslation();
  const [range, setRange] = useState('90');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState('');

  const download = async (type) => {
    if (range === 'custom' && from && to && from > to) return toast.error(t('"From" date must be before "To" date'));
    const params = range === 'custom' ? clean({ from, to }) : clean({ days: range === 'all' ? '' : range });
    setBusy(type);
    try {
      const r = await api.get(`/reports/${type}.pdf`, { params, responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      let msg = errMsg(e);
      if (e.response && e.response.data instanceof Blob) {
        try { msg = JSON.parse(await e.response.data.text()).message || msg; } catch (x) { /* keep default */ }
      }
      toast.error(msg);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="stack">
      <PageHeader title="Reports" subtitle={t('Generate printable PDF reports for management.')} />
      <div className="card">
        <div className="form-grid">
          <Field label="Period">
            <select value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="7">{t('Last 7 days')}</option><option value="30">{t('Last 30 days')}</option><option value="90">{t('Last 90 days')}</option>
              <option value="365">{t('Last year')}</option><option value="all">{t('All time')}</option><option value="custom">{t('Custom range')}</option>
            </select>
          </Field>
          {range === 'custom' && (
            <div className="form-grid">
              <Field label="From"><input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></Field>
              <Field label="To"><input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></Field>
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-2">
        {REPORTS.map((r) => (
          <div className="card" key={r.type}>
            <div className="card-title"><h3><Icon name={r.icon} size={18} /> {t(r.title)}</h3></div>
            <p className="muted mb">{t(r.desc)}</p>
            <button className="btn btn-primary" disabled={!!busy} onClick={() => download(r.type)}>
              <Icon name="download" size={18} /> {busy === r.type ? t('Generating...') : t('Download PDF')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
