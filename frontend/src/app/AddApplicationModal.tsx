'use client';

import React, { useState } from 'react';

type Props = { onClose: () => void; onSuccess: () => Promise<void>; };

type FormData = { company: string; role: string; resumeText: string; jdText: string; };

const EMPTY: FormData = { company: '', role: '', resumeText: '', jdText: '' };

export default function AddApplicationModal({ onClose, onSuccess }: Props) {
  const [form, setForm] = useState<FormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company.trim() || !form.role.trim()) { setErr('Company and Role are required.'); return; }
    setErr(null); setSaving(true);
    try {
      const r = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': '1' },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error('Failed to create application');
      await onSuccess();
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Something went wrong.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Application</h2>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '4px 8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="modal-body">
            {err && <div className="form-error">{err}</div>}

            <div className="field-row">
              <div className="field-group">
                <label className="field-label" htmlFor="company">Company *</label>
                <input id="company" className="field-input" type="text" placeholder="e.g. Google" value={form.company} onChange={set('company')} required />
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="role">Role *</label>
                <input id="role" className="field-input" type="text" placeholder="e.g. Backend Engineer" value={form.role} onChange={set('role')} required />
              </div>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="resumeText">Resume Text</label>
              <textarea id="resumeText" className="field-textarea" placeholder="Paste the relevant portion of your resume…" value={form.resumeText} onChange={set('resumeText')} rows={4} />
              <span className="field-hint">Required to run AI analysis.</span>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="jdText">Job Description</label>
              <textarea id="jdText" className="field-textarea" placeholder="Paste the full job description…" value={form.jdText} onChange={set('jdText')} rows={4} />
              <span className="field-hint">Required to run AI analysis.</span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><span className="spinner" /> Saving…</> : <><span className="material-symbols-outlined" style={{ fontSize: 13 }}>add</span> Add Role</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
