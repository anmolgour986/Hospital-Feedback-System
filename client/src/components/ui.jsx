import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const ICONS = {
  home: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
  star: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z',
  clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6',
  bell: 'M6 17h12l-2-3V9a4 4 0 0 0-8 0v5zM10 20a2 2 0 0 0 4 0',
  concierge: 'M3 18h18M5 18a7 7 0 0 1 14 0M12 8V6M10 6h4',
  chart: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
  users: 'M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM21 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  building: 'M3 21h18M5 21V7l7-4 7 4v14M9 9h1M14 9h1M9 13h1M14 13h1M10 21v-4h4v4',
  download: 'M12 3v12m0 0l-4-4m4 4l4-4M4 17v3h16v-3',
  qr: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v3M14 20h3M20 20h1',
  shield: 'M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  menu: 'M3 6h18M3 12h18M3 18h18',
  x: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  award: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  check: 'M5 13l4 4L19 7',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
  filter: 'M3 5h18l-7 8v6l-4-2v-4z',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  chevron: 'M9 6l6 6-6 6',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4z',
  activity: 'M3 12h4l3-8 4 16 3-8h4',
};

export const Icon = ({ name, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={ICONS[name] || ICONS.activity} />
  </svg>
);

export function Stars({ value = 0, size = 16 }) {
  const v = Math.round(value * 2) / 2;
  return (
    <span className="stars" aria-label={`${value} / 5`} role="img">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <defs>
            <linearGradient id={`g${i}-${v}-${size}`}>
              <stop offset={v >= i ? '100%' : v >= i - 0.5 ? '50%' : '0%'} stopColor="#f59e0b" />
              <stop offset={v >= i ? '100%' : v >= i - 0.5 ? '50%' : '0%'} stopColor="#e2e8f0" />
            </linearGradient>
          </defs>
          <path d={ICONS.star} fill={`url(#g${i}-${v}-${size})`} stroke="#f59e0b" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );
}

const LABELS = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export function StarInput({ value, onChange, label, big }) {
  const { t } = useTranslation();
  return (
    <div className="star-input" role="radiogroup" aria-label={label}>
      <div className="star-row">
        {[1, 2, 3, 4, 5].map((i) => (
          <button type="button" key={i} role="radio" aria-checked={value === i} aria-label={`${i}`} className={`star-btn ${i <= value ? 'on' : ''} ${big ? 'big' : ''}`} onClick={() => onChange(i === value ? 0 : i)}>
            <svg width={big ? 40 : 32} height={big ? 40 : 32} viewBox="0 0 24 24"><path d={ICONS.star} strokeWidth="1.4" strokeLinejoin="round" /></svg>
          </button>
        ))}
      </div>
      <span className="star-label">{value ? t(LABELS[value - 1]) : ''}</span>
    </div>
  );
}

const TONE = {
  Open: 'blue', Assigned: 'purple', 'In Progress': 'amber', Resolved: 'green', Closed: 'slate',
  Pending: 'slate', Accepted: 'blue', Completed: 'green', Cancelled: 'slate',
  Low: 'slate', Medium: 'blue', High: 'orange', Urgent: 'red',
  positive: 'green', neutral: 'slate', negative: 'red',
};

export function Badge({ value, tone, children }) {
  const { t } = useTranslation();
  return <span className={`badge b-${tone || TONE[value] || 'slate'}`}>{children || t(value)}</span>;
}

export const Loader = ({ text }) => {
  const { t } = useTranslation();
  return (
    <div className="loader" role="status">
      <span className="spinner" />
      <span>{text || t('Loading...')}</span>
    </div>
  );
};

export const Empty = ({ title, hint, action, icon = 'file' }) => {
  const { t } = useTranslation();
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icon} size={28} /></div>
      <h3>{t(title || 'Nothing here yet')}</h3>
      {hint && <p>{t(hint)}</p>}
      {action}
    </div>
  );
};

export function Pagination({ page, pages, onChange }) {
  const { t } = useTranslation();
  if (!pages || pages <= 1) return null;
  return (
    <div className="pagination">
      <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>{t('Previous')}</button>
      <span>{t('Page {{page}} of {{pages}}', { page, pages })}</span>
      <button className="btn btn-outline btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>{t('Next')}</button>
    </div>
  );
}

export const StatCard = ({ label, value, hint, tone = 'teal', icon }) => {
  const { t } = useTranslation();
  return (
    <div className={`stat tone-${tone}`}>
      {icon && <div className="stat-icon"><Icon name={icon} size={20} /></div>}
      <div className="stat-body">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{t(label)}</div>
        {hint && <div className="stat-hint">{hint}</div>}
      </div>
    </div>
  );
};

export const PageHeader = ({ title, subtitle, actions }) => {
  const { t } = useTranslation();
  return (
    <div className="page-header">
      <div>
        <h1>{t(title)}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
};

export function Modal({ open, title, onClose, children }) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-wrap" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{t(title)}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t('Close')}><Icon name="x" /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export const Field = ({ label, hint, children }) => {
  const { t } = useTranslation();
  return (
    <label className="field">
      <span className="field-label">{t(label)}</span>
      {children}
      {hint && <span className="field-hint">{t(hint)}</span>}
    </label>
  );
};
