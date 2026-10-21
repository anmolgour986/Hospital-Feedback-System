import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Empty } from '../components/ui';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <Empty icon="alert" title="Page not found" action={<Link className="btn btn-primary mt-s" to="/">{t('Go home')}</Link>} />
    </div>
  );
}
