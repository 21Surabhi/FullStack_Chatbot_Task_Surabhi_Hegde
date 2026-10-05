import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { api, ApiError } from '../api';
import type { EnquiryInput } from '../api';
import { SERVICES } from '../types';

type Errors = Partial<Record<keyof EnquiryInput, string>>;

// Same rules as the server, for instant feedback. The server checks again.
function validate(v: EnquiryInput): Errors {
  const e: Errors = {};
  if (v.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
  if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) e.email = 'Enter a valid email';
  if (v.phone && !/^[+\d][\d\s-]{6,15}$/.test(v.phone.trim())) e.phone = 'Enter a valid phone number';
  if (!v.service) e.service = 'Please choose a service';
  if (v.message.trim().length < 10) e.message = 'Message must be at least 10 characters';
  return e;
}

export default function EnquiryForm({ compact = false }: { compact?: boolean }) {
  const [v, setV] = useState<EnquiryInput>({ name: '', email: '', phone: '', service: '', message: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof EnquiryInput) => (e: { target: { value: string } }) =>
    setV({ ...v, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setServerError('');
    const errs = validate(v);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      await api.createEnquiry(v);
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, m]) => [k, m[0]])));
      } else {
        setServerError(err instanceof Error ? err.message : 'Something went wrong');
      }
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="success" role="status">
        Thanks! Your enquiry was received. Our team will contact you soon.
      </div>
    );
  }

  const field = (k: keyof EnquiryInput, label: string, input: ReactNode) => (
    <label className="field">
      {label}
      {input}
      {errors[k] && <span className="err" role="alert">{errors[k]}</span>}
    </label>
  );

  return (
    <form onSubmit={submit} noValidate className={compact ? 'form compact' : 'form'}>
      {field('name', 'Full name', <input value={v.name} onChange={set('name')} maxLength={80} />)}
      {field('email', 'Email', <input type="email" value={v.email} onChange={set('email')} maxLength={120} />)}
      {field('phone', 'Phone (optional)', <input type="tel" value={v.phone} onChange={set('phone')} />)}
      {field(
        'service',
        'I am interested in',
        <select value={v.service} onChange={set('service')}>
          <option value="">Select...</option>
          {SERVICES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      )}
      {field('message', 'Message', <textarea rows={compact ? 3 : 4} value={v.message} onChange={set('message')} maxLength={1000} />)}
      {serverError && <div className="err banner" role="alert">{serverError}</div>}
      <button className="btn" disabled={busy}>{busy ? 'Sending...' : 'Send enquiry'}</button>
    </form>
  );
}