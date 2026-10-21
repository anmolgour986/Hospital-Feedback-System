import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { Icon, Loader, PageHeader } from '../components/ui';

export default function QRCodes() {
  const { t } = useTranslation();
  const [depts, setDepts] = useState([]);
  const [dept, setDept] = useState('');
  const [qr, setQr] = useState(null);

  useEffect(() => { api.get('/departments').then((r) => setDepts(r.data.items)).catch(() => {}); }, []);

  useEffect(() => {
    let off = false;
    setQr(null);
    api.get('/qr', { params: dept ? { department: dept } : {} })
      .then((r) => { if (!off) setQr(r.data); })
      .catch((e) => { if (!off) toast.error(errMsg(e)); });
    return () => { off = true; };
  }, [dept]);

  const download = () => {
    const a = document.createElement('a');
    a.href = qr.dataUrl;
    a.download = `feedback-qr-${qr.label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const print = () => {
    const w = window.open('', '_blank');
    if (!w) return toast.error(t('Allow pop-ups to print'));
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    w.document.write(`<!doctype html><title>QR</title><body style="font-family:Arial,sans-serif;text-align:center;padding:40px"><h1>${esc(t('Scan to give feedback'))}</h1><h2>${esc(qr.label)}</h2><img src="${qr.dataUrl}" style="width:340px"/><p style="color:#555">${esc(qr.url)}</p><script>window.onload=function(){window.print()}<\/script></body>`);
    w.document.close();
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(qr.url); toast.success(t('Copied')); } catch (e) { toast.error(t('Could not copy')); }
  };

  return (
    <div className="stack">
      <PageHeader title="QR Codes" subtitle={t('Patients can scan a code to share feedback without logging in.')} />
      <div className="card" style={{ maxWidth: 520 }}>
        <select value={dept} onChange={(e) => setDept(e.target.value)} aria-label={t('Department')} style={{ marginBottom: 16 }}>
          <option value="">{t('Hospital-wide')}</option>
          {depts.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>
        {!qr ? <Loader /> : (
          <div className="center">
            <img className="qr-img" src={qr.dataUrl} alt={`QR code: ${qr.label}`} />
            <h3 className="mt-s">{qr.label}</h3>
            <p className="muted small" style={{ wordBreak: 'break-all' }}>{qr.url}</p>
            <div className="row mt" style={{ justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={download}><Icon name="download" size={18} /> {t('Download PNG')}</button>
              <button className="btn btn-outline" onClick={print}>{t('Print')}</button>
              <button className="btn btn-outline" onClick={copy}>{t('Copy link')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
