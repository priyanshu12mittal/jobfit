'use client';

import React, { useEffect, useState, useRef, useTransition } from 'react';
import Link from 'next/link';
import VerdictModal from './VerdictModal';
import AddApplicationModal from './AddApplicationModal';

export type Application = {
  id: number;
  company: string;
  role: string;
  status: string;
  fitScore: number | null;
  analysisJson?: string;
  createdAt: string;
  _dragging?: boolean;
};

const USER_ID = '1';

const COLUMNS = [
  { key: 'SAVED',     label: 'Applied'   },
  { key: 'SCREENING', label: 'Screening' },
  { key: 'INTERVIEW', label: 'Interview' },
  { key: 'OFFER',     label: 'Offer'     },
] as const;

const BADGE_STATUS: Record<string, string> = {
  SAVED:     'Pending',
  SCREENING: 'Passed',
  INTERVIEW: 'Active',
  OFFER:     'Offer',
};

const BADGE_CLASS: Record<string, string> = {
  SAVED:     'badge-pending',
  SCREENING: 'badge-passed',
  INTERVIEW: 'badge-active',
  OFFER:     'badge-offer',
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, ' ');
}

function reqId(id: number) {
  return `REQ-${String(id).padStart(3, '0')}`;
}

async function fetchApps(): Promise<Application[]> {
  const r = await fetch('/api/applications', { headers: { 'X-User-Id': USER_ID } });
  if (!r.ok) throw new Error('Failed to fetch applications');
  return r.json();
}

export default function Dashboard() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [analyzingIds, setAnalyzingIds] = useState<Set<number>>(new Set());

  // Quick verdict panel
  const [qResume, setQResume] = useState('');
  const [qJd, setQJd] = useState('');
  const [qAnalyzing, setQAnalyzing] = useState(false);

  // Drag state
  const dragAppId = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const reload = () =>
    fetchApps().then(data => setApps(data)).catch(console.error);

  useEffect(() => {
    fetchApps()
      .then(data => { setApps(data); setLoading(false); })
      .catch(e   => { setError(e.message); setLoading(false); });
  }, []);

  // ── Analyze ────────────────────────────────────────────────────
  const handleAnalyze = async (app: Application) => {
    setAnalyzingIds(prev => new Set(prev).add(app.id));
    try {
      const r = await fetch(`/api/applications/${app.id}/analyze`, { 
        method: 'POST',
        headers: { 'X-User-Id': USER_ID }
      });
      if (!r.ok) throw new Error('Analysis failed');
      const updated: Application = await r.json();
      startTransition(() => {
        setApps(prev => prev.map(a => a.id === updated.id ? updated : a));
        setSelectedApp(updated);
      });
    } catch (e) {
      console.error(e);
      alert('Analysis failed — ensure resume text and JD text are both filled in.');
    } finally {
      setAnalyzingIds(prev => { const s = new Set(prev); s.delete(app.id); return s; });
    }
  };

  // ── Quick verdict ──────────────────────────────────────────────
  const handleQuickVerdict = async () => {
    if (!qResume.trim() || !qJd.trim()) { alert('Paste both resume and job description.'); return; }
    setQAnalyzing(true);
    try {
      // Create a temp application then analyze
      const createRes = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': USER_ID },
        body: JSON.stringify({ company: 'Quick Verdict', role: 'Quick Analysis', resumeText: qResume, jdText: qJd }),
      });
      if (!createRes.ok) throw new Error('Failed to create application');
      const created: Application = await createRes.json();

      const analyzeRes = await fetch(`/api/applications/${created.id}/analyze`, { 
        method: 'POST',
        headers: { 'X-User-Id': USER_ID }
      });
      if (!analyzeRes.ok) throw new Error('Analysis failed');
      const analyzed: Application = await analyzeRes.json();

      setApps(prev => [...prev, analyzed]);
      setSelectedApp(analyzed);
      setQResume(''); setQJd('');
    } catch (e) {
      console.error(e);
      alert('Quick verdict failed. Make sure both services are running.');
    } finally {
      setQAnalyzing(false);
    }
  };

  // ── Status update ──────────────────────────────────────────────
  const updateStatus = async (appId: number, newStatus: string) => {
    try {
      const r = await fetch(`/api/applications/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': USER_ID },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!r.ok) throw new Error('Status update failed');
      const updated: Application = await r.json();
      setApps(prev => prev.map(a => a.id === updated.id ? updated : a));
    } catch (e) { console.error(e); }
  };

  // ── Drag & Drop ────────────────────────────────────────────────
  const onDragStart = (e: React.DragEvent, appId: number) => {
    dragAppId.current = appId;
    e.dataTransfer.effectAllowed = 'move';
    // Slight delay so the ghost doesn't show the dim state immediately
    setTimeout(() => {
      setApps(prev => prev.map(a => a.id === appId ? { ...a, _dragging: true } : a));
    }, 0);
  };

  const onDragEnd = () => {
    dragAppId.current = null;
    setDragOver(null);
    setApps(prev => prev.map(a => ({ ...a, _dragging: false })));
  };

  const onDragOver = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(colKey);
  };

  const onDrop = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    setDragOver(null);
    if (dragAppId.current == null) return;
    const id = dragAppId.current;
    dragAppId.current = null;
    const app = apps.find(a => a.id === id);
    if (!app || app.status === colKey) return;
    // Optimistic update
    setApps(prev => prev.map(a => a.id === id ? { ...a, status: colKey } : a));
    updateStatus(id, colKey);
  };

  // ── Render ─────────────────────────────────────────────────────
  const byStatus = (key: string) => apps.filter(a => a.status === key);

  if (loading) {
    return (
      <>
        <header className="app-header">
          <div className="header-inner">
            <div className="header-logo">JOBFIT</div>
          </div>
        </header>
        <div className="page-body">
          <div className="skeleton-board" style={{ marginTop: 'var(--s8)' }}>
            {COLUMNS.map(col => (
              <div key={col.key} className="skeleton-col">
                <div className="skeleton-bar" style={{ height: 12, width: '50%', marginBottom: 'var(--s4)' }} />
                <div className="skeleton-bar" style={{ height: 110 }} />
                <div className="skeleton-bar" style={{ height: 110, opacity: 0.6 }} />
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <div className="state-full">
        <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--accent-red)' }}>error</span>
        <p style={{ fontFamily: 'var(--font-utility)', fontSize: 12, color: '#e05c70' }}>{error}</p>
        <button className="btn btn-secondary" onClick={() => { setLoading(true); setError(null); reload(); }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="app-header">
        <div className="header-inner">
          <div className="header-logo">JOBFIT</div>

          <nav className="header-nav">
            <Link href="/" className="active">Dashboard</Link>
            <a href="#">History</a>
            <a href="#">Archive</a>
          </nav>

          <div className="header-right">
            <span className="now-showing-badge">
              NOW SHOWING: <strong>{apps.length}</strong> application{apps.length !== 1 ? 's' : ''}
            </span>

            <button className="icon-btn icon-btn-add" title="Add new role" onClick={() => setShowAdd(true)}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, lineHeight: 1 }}>add</span>
            </button>

            <button className="icon-btn" title="Profile">
              <span className="material-symbols-outlined" style={{ fontSize: 16, lineHeight: 1 }}>account_circle</span>
            </button>
          </div>
        </div>
      </header>

      <div className="page-body">
        {/* ── Quick Verdict ──────────────────────────────────── */}
        <div className="section-title">
          <span className="material-symbols-outlined section-title-icon" style={{ fontSize: 20 }}>gavel</span>
          <h2>Get a Verdict</h2>
        </div>

        <div className="verdict-panel">
          <div className="verdict-panel-grid">
            <div>
              <div className="verdict-field-label">Applicant Resume</div>
              <textarea
                className="verdict-textarea"
                placeholder="Paste full resume text here…"
                value={qResume}
                onChange={e => setQResume(e.target.value)}
                rows={5}
              />
            </div>
            <div>
              <div className="verdict-field-label">Job Description</div>
              <textarea
                className="verdict-textarea"
                placeholder="Paste job description requirements…"
                value={qJd}
                onChange={e => setQJd(e.target.value)}
                rows={5}
              />
            </div>
          </div>

          <button
            className="analyze-btn"
            onClick={handleQuickVerdict}
            disabled={qAnalyzing}
          >
            {qAnalyzing
              ? <><span className="spinner" /> Analyzing…</>
              : 'Analyze Match'}
          </button>
        </div>

        <hr className="section-rule" />

        {/* ── Marquee Board ──────────────────────────────────── */}
        <div className="section-title">
          <span className="material-symbols-outlined section-title-icon" style={{ fontSize: 20 }}>movie</span>
          <h2>The Marquee Board</h2>
        </div>

        <div className="marquee-board">
          <div className="board-columns">
            {COLUMNS.map(col => {
              const colApps = byStatus(col.key);
              return (
                <div
                  key={col.key}
                  className={`board-column${dragOver === col.key ? ' drag-over' : ''}`}
                  onDragOver={e => onDragOver(e, col.key)}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={e => onDrop(e, col.key)}
                >
                  <div className="col-header">
                    <span className="col-title">{col.label}</span>
                    <span className={`col-count${colApps.length === 0 ? ' empty' : ''}`}>
                      {colApps.length === 0 ? '○' : colApps.length}
                    </span>
                  </div>

                  {colApps.length === 0 && (
                    <div className="col-empty">
                      <span className="material-symbols-outlined col-empty-icon">inbox</span>
                      <span className="col-empty-text">Nothing in<br />the booth yet.</span>
                    </div>
                  )}

                  {colApps.map(app => {
                    const isAnalyzing = analyzingIds.has(app.id);
                    const isDragging = app._dragging;

                    return (
                      <div
                        key={app.id}
                        className={`ticket${isDragging ? ' dragging' : ''}`}
                        draggable
                        onDragStart={e => onDragStart(e, app.id)}
                        onDragEnd={onDragEnd}
                      >
                        {/* Certified stamp overlay */}
                        {app.fitScore !== null && app.fitScore >= 70 && (
                          <div className="cert-stamp">Certified Match</div>
                        )}

                        {/* Meta */}
                        <div className="ticket-meta">
                          <span className="ticket-id">ID: {reqId(app.id)}</span>
                          <span className={`status-badge ${BADGE_CLASS[app.status] ?? 'badge-pending'}`}>
                            {app.fitScore !== null ? `Fit ${app.fitScore}%` : BADGE_STATUS[app.status] ?? app.status}
                          </span>
                        </div>

                        {/* Perforation */}
                        <div className="ticket-perf">
                          <div className="ticket-perf-line" />
                        </div>

                        {/* Body */}
                        <div className="ticket-role">{app.role}</div>
                        <div className="ticket-company">{app.company}</div>

                        {/* Perforation */}
                        <div className="ticket-perf">
                          <div className="ticket-perf-line" />
                        </div>

                        {/* Footer */}
                        <div className="ticket-footer">
                          <span className="ticket-date">{fmtDate(app.createdAt)}</span>

                          {isAnalyzing ? (
                            <span className="ticket-action-btn analyzing">
                              <span className="spinner" /> Analyzing…
                            </span>
                          ) : app.fitScore === null ? (
                            <button
                              className="ticket-action-btn"
                              onClick={() => handleAnalyze(app)}
                            >
                              Review
                            </button>
                          ) : (
                            <button
                              className="ticket-action-btn"
                              onClick={() => setSelectedApp(app)}
                            >
                              Details
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────── */}
      {selectedApp && (
        <VerdictModal application={selectedApp} onClose={() => setSelectedApp(null)} />
      )}

      {showAdd && (
        <AddApplicationModal
          onClose={() => setShowAdd(false)}
          onSuccess={async () => { setShowAdd(false); await reload(); }}
        />
      )}
    </>
  );
}
