import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { Empty, Loader, PageHeader, Pagination } from '../components/ui';
import { fmtDate } from '../constants';

const ACTIONS = ['LOGIN', 'LOGIN_FAILED', 'ADMIN_LOGIN', 'ADMIN_LOGIN_FAILED', 'ADMIN_PORTAL_DENIED', 'REGISTER', 'PASSWORD_CHANGED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_DONE', 'DATA_EXPORT', 'ACCOUNT_DELETED',
  'USER_CREATED', 'USER_UPDATED', 'USER_PASSWORD_RESET_BY_ADMIN', 'DEPARTMENT_CREATED', 'DEPARTMENT_UPDATED', 'DEPARTMENT_REMOVED', 'COMPLAINT_ASSIGNED',
  'COMPLAINT_DELETED', 'FEEDBACK_DELETED', 'REPORT_GENERATED', 'ESCALATION_RUN_MANUAL'];

const MEASURES = [
  'Passwords are hashed with bcrypt and never returned by the API',
  'JWT sessions with role-based access control on every route',
  'Accounts lock for 15 minutes after 5 failed logins',
  'Rate limiting, secure HTTP headers (Helmet) and NoSQL-injection filtering',
  'Anonymous feedback and complaints hide the patient identity from staff and admins',
  'Patients can download or erase their personal data',
  'Every sensitive action is written to the audit log below (kept for 180 days)',
];

export default function Security() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');

  const load = useCallback(() => {
    api.get('/audit', { params: { page, limit: 20, ...(action ? { action } : {}) } })
      .then((r) => setData(r.data))
      .catch((e) => toast.error(errMsg(e)));
  }, [page, action]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [action]);

  return (
    <div className="stack">
      <PageHeader title="Security" subtitle={t('Data privacy and security management')} />
      <div className="card">
        <div className="card-title"><h3>{t('Protection measures')}</h3></div>
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
          {MEASURES.map((m) => <li key={m}>{t(m)}</li>)}
        </ul>
      </div>
      <div className="card">
        <div className="card-title">
          <h3>{t('Audit log')}</h3>
          <select value={action} onChange={(e) => setAction(e.target.value)} aria-label={t('Action')}>
            <option value="">{t('All actions')}</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        {!data ? <Loader /> : data.items.length === 0 ? <Empty title="No results found" icon="shield" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>{t('Date')}</th><th>{t('Action')}</th><th>{t('User')}</th><th>IP</th><th>{t('Details')}</th></tr></thead>
              <tbody>
                {data.items.map((a) => (
                  <tr key={a._id}>
                    <td className="nowrap">{fmtDate(a.createdAt, i18n.language)}</td>
                    <td><strong>{a.action.replace(/_/g, ' ')}</strong></td>
                    <td>{a.userName || '—'}</td>
                    <td className="nowrap">{a.ip || '—'}</td>
                    <td className="small muted">{a.meta && Object.keys(a.meta).length ? Object.entries(a.meta).map(([k, v]) => `${k}: ${v}`).join(', ') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
      </div>
    </div>
  );
}
