import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { Badge, Empty, Field, Icon, Loader, Modal, PageHeader } from '../components/ui';

export default function Departments() {
  const { t } = useTranslation();
  const [items, setItems] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get('/departments', { params: { all: true } }).then((r) => setItems(r.data.items)).catch((e) => toast.error(errMsg(e)));
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const body = { name: form.name.trim(), description: form.description };
      if (form._id) await api.put(`/departments/${form._id}`, { ...body, isActive: form.isActive });
      else await api.post('/departments', body);
      toast.success(t('Saved'));
      setForm(null);
      load();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (d) => {
    if (!window.confirm(`${t('Delete')} "${d.name}"?`)) return;
    try {
      const r = await api.delete(`/departments/${d._id}`);
      toast.success(r.data.message);
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const toggle = async (d) => {
    try {
      await api.put(`/departments/${d._id}`, { isActive: !d.isActive });
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <>
      <PageHeader title="Departments" actions={<button className="btn btn-primary" onClick={() => { setError(''); setForm({ name: '', description: '', isActive: true }); }}><Icon name="plus" size={18} /> {t('Add department')}</button>} />
      {!items ? <Loader /> : items.length === 0 ? <Empty title="No departments yet" icon="building" /> : (
        <div className="list">
          {items.map((d) => (
            <div className="item" key={d._id}>
              <div className="item-top">
                <div style={{ minWidth: 0 }}>
                  <div className="item-title">{d.name}</div>
                  {d.description && <div className="muted small">{d.description}</div>}
                </div>
                <Badge tone={d.isActive ? 'green' : 'slate'}>{d.isActive ? t('Active') : t('Inactive')}</Badge>
              </div>
              <div className="row mt-s">
                <button className="btn btn-outline btn-sm" onClick={() => { setError(''); setForm({ ...d }); }}><Icon name="edit" size={16} /> {t('Edit')}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => toggle(d)}>{d.isActive ? t('Deactivate') : t('Activate')}</button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => remove(d)}><Icon name="trash" size={16} /> {t('Delete')}</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!form} title={form && form._id ? 'Edit department' : 'Add department'} onClose={() => setForm(null)}>
        {form && (
          <form onSubmit={save} noValidate>
            <Field label="Name"><input type="text" value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
            <Field label="Description"><textarea value={form.description || ''} maxLength={300} style={{ minHeight: 80 }} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            {error && <p className="error-text" role="alert">{error}</p>}
            <div className="row"><button className="btn btn-primary" disabled={busy || form.name.trim().length < 2}>{busy ? '...' : t('Save')}</button><button type="button" className="btn btn-outline" onClick={() => setForm(null)}>{t('Cancel')}</button></div>
          </form>
        )}
      </Modal>
    </>
  );
}
