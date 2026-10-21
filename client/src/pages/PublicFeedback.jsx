import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api, { errMsg } from '../api';
import FeedbackForm from '../components/FeedbackForm';
import { Icon, Loader } from '../components/ui';
import { setLanguage } from '../i18n';

// Reached by scanning a QR code. No login required; submissions are anonymous.
export default function PublicFeedback() {
  const { t, i18n } = useTranslation();
  const [params] = useSearchParams();
  const [dir, setDir] = useState(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    api.get('/public/directory').then((r) => setDir(r.data)).catch((e) => setError(errMsg(e)));
  }, []);

  const dept = params.get('dept') || '';

  return (
    <div className="pub-wrap">
      <div className="pub-head">
        <strong style={{ color: 'var(--primary-dark)', fontSize: '1.1rem' }}>🏥 {t('Hospital Feedback')}</strong>
        <button className="lang-btn" onClick={() => setLanguage(i18n.language === 'hi' ? 'en' : 'hi')}>
          <Icon name="globe" size={16} /> {i18n.language === 'hi' ? 'EN' : 'हिं'}
        </button>
      </div>
      <h1 className="mb">{t('Share your experience')}</h1>
      {error && <div className="alert danger">{error}</div>}
      {!dir && !error && <Loader />}
      {dir && (done ? (
        <div className="card center">
          <div style={{ fontSize: 48 }}>🙏</div>
          <h2 className="mt-s">{t('Thank you for your feedback!')}</h2>
          <button className="btn btn-primary mt" onClick={() => { setDone(false); setKey((k) => k + 1); }}>{t('Submit another')}</button>
        </div>
      ) : (
        <FeedbackForm key={key} directory={dir} initialDept={dept} isPublic onDone={() => setDone(true)} />
      ))}
      <p className="center muted small mt"><Link to="/login">{t('Login')}</Link></p>
    </div>
  );
}
