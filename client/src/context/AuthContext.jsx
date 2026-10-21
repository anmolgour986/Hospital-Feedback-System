import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api';
import { setLanguage } from '../i18n';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem('hfm_token'));

  useEffect(() => {
    if (!localStorage.getItem('hfm_token')) return;
    api.get('/auth/me')
      .then((r) => setUser(r.data.user))
      .catch(() => localStorage.removeItem('hfm_token'))
      .finally(() => setLoading(false));
  }, []);

  const startSession = (data) => {
    localStorage.setItem('hfm_token', data.token);
    setUser(data.user);
    if (!localStorage.getItem('hfm_lang') && data.user.language) setLanguage(data.user.language);
    return data.user;
  };

  const login = useCallback(async (email, password) => startSession((await api.post('/auth/login', { email, password })).data), []);
  const adminLogin = useCallback(async (email, password) => startSession((await api.post('/auth/admin-login', { email, password })).data), []);
  const register = useCallback(async (payload) => startSession((await api.post('/auth/register', payload)).data), []);
  const logout = useCallback(() => {
    localStorage.removeItem('hfm_token');
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, setUser, loading, login, adminLogin, register, logout }}>{children}</AuthContext.Provider>;
}
