import React from 'react';
import type { Application } from './page';

type Props = { application: Application; onClose: () => void; };

type Analysis = {
  fit_score: number;
  strengths: string[];
  gaps: string[];
  suggested_bullets: string[];
};

function scoreClass(n: number) { return n >= 75 ? 'score-high' : n >= 50 ? 'score-mid' : 'score-low'; }
function scoreLabel(n: number) { return n >= 75 ? 'Strong Match' : n >= 50 ? 'Partial Match' : 'Significant Gaps'; }

export default function VerdictModal({ application, onClose }: Props) {
  if (!application.analysisJson) return null;

  let analysis: Analysis;
  try { analysis = JSON.parse(application.analysisJson); }
  catch { return null; }

  const { fit_score, strengths = [], gaps = [], suggested_bullets = [] } = analysis;

  return (
    <div className="verdict-overlay" onClick={onClose}>
      <div className="verdict-wrap" onClick={e => e.stopPropagation()}>

        <div className="verdict-close-row">
          <button className="btn btn-ghost" onClick={onClose} style={{ fontSize: 11 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
            Close
          </button>
        </div>

        {/* Certificate Stamp */}
        <div className="verdict-cert">
          <div className="verdict-cert-perfs">
            {Array.from({ length: 16 }).map((_, i) => <div key={i} className="verdict-perf-dot" />)}
          </div>

          <div className="verdict-cert-body">
            <div className="verdict-eyebrow">Certificate of Fit — ID: REQ-{String(application.id).padStart(3, '0')}</div>

            <div className={`verdict-big-score ${scoreClass(fit_score)}`}>
              {fit_score}<span className="verdict-denom">/100</span>
            </div>

            <div className="verdict-rating">{scoreLabel(fit_score)}</div>

            <div className="verdict-sub">
              <strong style={{ color: 'var(--text-primary)' }}>{application.role}</strong> at <strong style={{ color: 'var(--text-primary)' }}>{application.company}</strong>
              {gaps.length > 0
                ? ` — ${gaps.length} gap${gaps.length > 1 ? 's' : ''} to close.`
                : ' — You are ready to apply!'}
            </div>
          </div>
        </div>

        {/* Detail Sections */}
        <div className="verdict-sections">
          {strengths.length > 0 && (
            <div className="verdict-section">
              <div className="verdict-section-hd">
                <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#8ab870' }}>check_circle</span>
                Strengths ({strengths.length})
              </div>
              <div className="verdict-section-body">
                {strengths.map((s, i) => (
                  <div key={i} className="verdict-item">
                    <span className="vbullet vbullet-strength">▲</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {gaps.length > 0 && (
            <div className="verdict-section">
              <div className="verdict-section-hd">
                <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#e05c70' }}>warning</span>
                Gaps to Address ({gaps.length})
              </div>
              <div className="verdict-section-body">
                {gaps.map((g, i) => (
                  <div key={i} className="verdict-item">
                    <span className="vbullet vbullet-gap">▼</span>
                    <span>{g}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {suggested_bullets.length > 0 && (
            <div className="verdict-section">
              <div className="verdict-section-hd">
                <span className="material-symbols-outlined" style={{ fontSize: 13, color: 'var(--accent-brass)' }}>edit_note</span>
                Suggested Resume Bullets
              </div>
              <div className="verdict-section-body">
                {suggested_bullets.map((b, i) => (
                  <div key={i} className="verdict-item">
                    <span className="vbullet vbullet-suggest">→</span>
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="verdict-actions">
          <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
            Back to Board
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={() => navigator.clipboard.writeText(suggested_bullets.join('\n\n'))}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>content_copy</span>
            Copy Bullets
          </button>
        </div>
      </div>
    </div>
  );
}
