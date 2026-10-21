import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import FeedbackForm from '../components/FeedbackForm';
import { Loader, PageHeader } from '../components/ui';

export default function FeedbackNew() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [dir, setDir] = useState(null);

  useEffect(() => {
    api.get('/public/directory').then((r) => setDir(r.data)).catch((e) => toast.error(errMsg(e)));
  }, []);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <PageHeader title="Share your experience" />
      {!dir ? <Loader /> : (
        <FeedbackForm directory={dir} initialDept={params.get('dept') || ''} onDone={() => { toast.success(t('Thank you for your feedback!')); nav('/feedback'); }} />
      )}
    </div>
  );
}
