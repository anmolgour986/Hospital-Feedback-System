import { useTranslation } from 'react-i18next';
import { Icon } from '../components/ui';
import { setLanguage } from '../i18n';

export default function AuthShell({ children }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="auth-wrap">
      <div className="auth-side">
        <h1>{t('Hospital Feedback & Service System')}</h1>
        <p>{t('Your health, your voice')}</p>
        <ul>
          <li>⭐ {t('Share your experience')}</li>
          <li>📝 {t('Register a complaint')}</li>
          <li>🛎️ {t('New service request')}</li>
          <li>🔔 {t('Track status')}</li>
        </ul>
      </div>
      <div className="auth-main">
        <div className="auth-card">
          <div className="auth-top">
            <strong style={{ color: 'var(--primary-dark)' }}>{t('Hospital Feedback')}</strong>
            <button className="lang-btn" type="button" onClick={() => setLanguage(i18n.language === 'hi' ? 'en' : 'hi')}>
              <Icon name="globe" size={16} /> {i18n.language === 'hi' ? 'EN' : 'हिं'}
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
