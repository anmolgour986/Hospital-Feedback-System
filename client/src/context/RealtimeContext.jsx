import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import api from '../api';
import { useAuth } from './AuthContext';

const RealtimeContext = createContext({ unread: 0, setUnread: () => {}, refreshUnread: () => {} });
export const useRealtime = () => useContext(RealtimeContext);

const EVENT = 'hfm:notification';

// Run a callback whenever a real-time notification arrives (used to refresh lists/dashboards)
export function useOnNotification(fn) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const h = (e) => ref.current && ref.current(e.detail);
    window.addEventListener(EVENT, h);
    return () => window.removeEventListener(EVENT, h);
  }, []);
}

export function RealtimeProvider({ children }) {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const userId = user ? user._id : null;

  const refreshUnread = useCallback(() => {
    api.get('/notifications/unread-count').then((r) => setUnread(r.data.unread)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!userId) { setUnread(0); return undefined; }
    refreshUnread();
    const socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
      auth: { token: localStorage.getItem('hfm_token') },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });
    socket.on('notification', (n) => {
      setUnread((u) => u + 1);
      toast(
        (t) => (
          <div onClick={() => toast.dismiss(t.id)} style={{ cursor: 'pointer' }}>
            <strong style={{ display: 'block', fontSize: 14 }}>{n.title}</strong>
            <span style={{ fontSize: 13, color: '#475569' }}>{n.message}</span>
          </div>
        ),
        { icon: n.type === 'danger' ? '🚨' : n.type === 'warning' ? '⚠️' : n.type === 'success' ? '✅' : '🔔', duration: 6000 }
      );
      window.dispatchEvent(new CustomEvent(EVENT, { detail: n }));
    });
    return () => socket.disconnect();
  }, [userId, refreshUnread]);

  return <RealtimeContext.Provider value={{ unread, setUnread, refreshUnread }}>{children}</RealtimeContext.Provider>;
}
