import { useEffect, useState } from 'react';
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { Icon } from './ui';
import { setLanguage } from '../i18n';
import api from '../api';

const NAV = {
  patient: [
    { to: '/', icon: 'home', label: 'Dashboard', end: true, bottom: true },
    { to: '/feedback/new', icon: 'star', label: 'Give Feedback', bottom: true },
    { to: '/complaints', icon: 'file', label: 'Complaints', bottom: true },
    { to: '/requests', icon: 'concierge', label: 'Service Requests', bottom: true },
    { to: '/feedback', icon: 'clock', label: 'My Feedback' },
    { to: '/profile', icon: 'user', label: 'Profile' },
  ],
  staff: [
    { to: '/', icon: 'home', label: 'Dashboard', end: true, bottom: true },
    { to: '/complaints', icon: 'file', label: 'Complaints', bottom: true },
    { to: '/requests', icon: 'concierge', label: 'Service Requests', bottom: true },
    { to: '/feedback', icon: 'star', label: 'Feedback', bottom: true },
    { to: '/analytics', icon: 'chart', label: 'Analytics' },
    { to: '/qr', icon: 'qr', label: 'QR Codes' },
    { to: '/profile', icon: 'user', label: 'Profile' },
  ],
  admin: [
    { to: '/', icon: 'home', label: 'Dashboard', end: true, bottom: true },
    { to: '/complaints', icon: 'file', label: 'Complaints', bottom: true },
    { to: '/requests', icon: 'concierge', label: 'Service Requests', bottom: true },
    { to: '/analytics', icon: 'chart', label: 'Analytics', bottom: true },
    { to: '/feedback', icon: 'star', label: 'Feedback' },
    { to: '/performance', icon: 'award', label: 'Performance' },
    { to: '/reports', icon: 'download', label: 'Reports' },
    { to: '/users', icon: 'users', label: 'Users' },
    { to: '/departments', icon: 'building', label: 'Departments' },
    { to: '/qr', icon: 'qr', label: 'QR Codes' },
    { to: '/security', icon: 'shield', label: 'Security' },
    { to: '/profile', icon: 'user', label: 'Profile' },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const { unread } = useRealtime();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const navigate = useNavigate();
  const signOut = () => { logout(); navigate('/login', { replace: true }); };

  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [loc.pathname]);

  const items = NAV[user.role] || [];
  const bottom = items.filter((i) => i.bottom);

  const toggleLang = () => {
    const next = i18n.language === 'hi' ? 'en' : 'hi';
    setLanguage(next);
    api.put('/auth/profile', { language: next }).catch(() => {});
  };

  const initials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="app">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <Link to="/" className="brand">
          <span className="brand-logo"><svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" /></svg></span>
          <span><strong>{t('Hospital Feedback')}</strong><small>{t('Patient Feedback & Service Management')}</small></span>
        </Link>
        <nav className="side-nav">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
              <Icon name={i.icon} /> <span>{t(i.label)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          <div className="user-chip">
            <span className="avatar">{initials}</span>
            <span className="user-meta"><strong>{user.name}</strong><small>{t(user.role)}{user.department ? ` · ${user.department.name}` : ''}</small></span>
          </div>
          <button className="side-link" onClick={signOut}><Icon name="logout" /> <span>{t('Logout')}</span></button>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Menu"><Icon name="menu" /></button>
          <span className="topbar-title">{t('Hospital Feedback')}</span>
          <div className="topbar-right">
            <button className="lang-btn" onClick={toggleLang} aria-label="Language"><Icon name="globe" size={16} /> {i18n.language === 'hi' ? 'EN' : 'हिं'}</button>
            <Link to="/notifications" className="icon-btn bell" aria-label={t('Notifications')}>
              <Icon name="bell" />
              {unread > 0 && <span className="dot">{unread > 99 ? '99+' : unread}</span>}
            </Link>
          </div>
        </header>
        <main className="content"><Outlet /></main>
      </div>

      <nav className="bottom-nav" aria-label="Primary">
        {bottom.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `bn-item ${isActive ? 'active' : ''}`}>
            <Icon name={i.icon} size={22} /><span>{t(i.label)}</span>
          </NavLink>
        ))}
        <button className="bn-item" onClick={() => setOpen(true)}><Icon name="menu" size={22} /><span>{t('More')}</span></button>
      </nav>
    </div>
  );
}
