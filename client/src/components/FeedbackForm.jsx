import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { Field, StarInput } from './ui';
import { VISIT_TYPES } from '../constants';

// Used by the logged-in patient form and by the public QR / anonymous form
export default function FeedbackForm({ directory, initialDept = '', isPublic = false, onDone }) {
  const { t, i18n } = useTranslation();
  const [dept, setDept] = useState(initialDept);
  const [staffMember, setStaffMember] = useState('');
  const [rating, setRating] = useState(0);
  const [staffRating, setStaffRating] = useState(0);
  const [comment, setComment] = useState('');
  const [visitType, setVisitType] = useState('OPD');
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);

  const staffOptions = useMemo(() => (directory.staff || []).filter((s) => String(s.department) === String(dept)), [directory.staff, dept]);

  const submit = async (e) => {
    e.preventDefault();
    if (!dept) return toast.error(t('Please select a department'));
    if (!rating) return toast.error(t('Please give a star rating'));
    setBusy(true);
    try {
      await api.post(isPublic ? '/public/feedback' : '/feedback', {
        department: dept,
        rating,
        staffMember: staffMember || undefined,
        staffRating: staffMember && staffRating ? staffRating : undefined,
        comment: comment.trim(),
        visitType,
        isAnonymous: isPublic ? true : anonymous,
        language: i18n.language,
      });
      onDone();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card" noValidate>
      <div className="form-grid">
        <Field label="Department">
          <select value={dept} onChange={(e) => { setDept(e.target.value); setStaffMember(''); setStaffRating(0); }} required>
            <option value="">{t('Select department')}</option>
            {directory.departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Visit type">
          <select value={visitType} onChange={(e) => setVisitType(e.target.value)}>
            {VISIT_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </Field>
      </div>

      <div className="field">
        <span className="field-label">{t('Overall experience')} *</span>
        <StarInput big value={rating} onChange={setRating} label={t('Overall experience')} />
      </div>

      <Field label="Doctor / staff member (optional)">
        <select value={staffMember} onChange={(e) => { setStaffMember(e.target.value); setStaffRating(0); }} disabled={!dept}>
          <option value="">{t('No doctor / staff')}</option>
          {staffOptions.map((s) => <option key={s._id} value={s._id}>{s.name}{s.designation ? ` — ${s.designation}` : ''}</option>)}
        </select>
      </Field>
      {staffMember && (
        <div className="field">
          <span className="field-label">{t('Rate the doctor / staff')}</span>
          <StarInput value={staffRating} onChange={setStaffRating} label={t('Rate the doctor / staff')} />
        </div>
      )}

      <Field label="Your comments">
        <textarea value={comment} maxLength={2000} placeholder={t('Tell us what went well or what we can improve')} onChange={(e) => setComment(e.target.value)} />
      </Field>

      {isPublic ? (
        <p className="muted small mb">🔒 {t('Your identity will be hidden from staff and admin')}</p>
      ) : (
        <label className="check">
          <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
          <span><b>{t('Submit anonymously')}</b><br /><span className="muted small">{t('Your identity will be hidden from staff and admin')}</span></span>
        </label>
      )}

      <button className="btn btn-primary btn-block" disabled={busy}>{busy ? '...' : t('Submit')}</button>
    </form>
  );
}
