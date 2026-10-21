import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { useOnNotification, useRealtime } from '../context/RealtimeContext';
import { Empty, Loader, PageHeader, Pagination } from '../components/ui';
import { fmtDate } from '../constants';

const ICON = { info: '🔔', success: '✅', warning: '⚠️', danger: '🚨' };

export default function Notifications() {
  const { t, i18n } = useTranslation();
  const nav = useNavigate();
  const { refreshUnread } = useRealtime();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    api.get('/notifications', { params: { page, limit: 20 } }).then((r) => setData(r.data)).catch((e) => toast.error(errMsg(e)));
  }, [page]);
  useEffect(() => { load(); }, [load]);
  useOnNotification(load);

  const open = async (n) => {
    if (!n.read) { await api.put(`/notifications/${n._id}/read`).catch(() => {}); refreshUnread(); }
    if (n.link) nav(n.link); else load();
  };
  const readAll = async () => { await api.put('/notifications/read-all').catch((e) => toast.error(errMsg(e))); refreshUnread(); load(); };

  return (
    <>
      <PageHeader title="Notifications" actions={data && data.unread > 0 && <button className="btn btn-outline" onClick={readAll}>{t('Mark all as read')}</button>} />
      {!data ? <Loader /> : data.items.length === 0 ? <Empty icon="bell" title="No notifications" /> : (
        <div className="list">
          {data.items.map((n) => (
            <div key={n._id} className={`item ${n.read ? '' : 'unread'}`} style={{ cursor: 'pointer' }} onClick={() => open(n)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && open(n)}>
              <div className="item-top"><div><span aria-hidden="true">{ICON[n.type] || '🔔'}</span> <b>{n.title}</b></div></div>
              <p className="muted" style={{ marginTop: 4 }}>{n.message}</p>
              <div className="item-meta"><span>{fmtDate(n.createdAt, i18n.language)}</span></div>
            </div>
          ))}
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </>
  );
}
