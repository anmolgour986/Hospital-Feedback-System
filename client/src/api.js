import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 30000 });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('hfm_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const url = err.config && err.config.url ? err.config.url : '';
    if (err.response && err.response.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/admin-login')) {
      localStorage.removeItem('hfm_token');
      const p = window.location.pathname;
      if (!p.startsWith('/login') && !p.startsWith('/admin/login') && !p.startsWith('/feedback/public') && !p.startsWith('/reset-password') && !p.startsWith('/forgot-password') && !p.startsWith('/register')) {
        window.location.href = p.startsWith('/admin') ? '/admin/login' : '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const errMsg = (e) => (e && e.response && e.response.data && e.response.data.message) || (e && e.code === 'ERR_NETWORK' ? 'Cannot reach the server. Check your connection.' : (e && e.message) || 'Something went wrong');

export default api;
