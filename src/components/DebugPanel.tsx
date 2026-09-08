import React, { useState } from 'react';
import { ResolvedLayout } from '../engine/types';
import { Terminal, CheckCircle2, AlertCircle, ArrowDownRight, Layers, HelpCircle } from 'lucide-react';

interface DebugPanelProps {
  layout: ResolvedLayout;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ layout }) => {
  const [activeTab, setActiveTab] = useState<'elements' | 'degradation' | 'solver'>('elements');
  const { diagnostics, elements } = layout;

  return (
    <div className="debug-panel-card">
      <div className="debug-header">
        <div className="debug-title-row">
          <Terminal size={18} className="text-accent" />
          <span className="debug-title">Layout Engine Diagnostics</span>
          <span className={`status-pill ${diagnostics.isValid ? 'valid' : 'invalid'}`}>
            {diagnostics.isValid ? (
              <>
                <CheckCircle2 size={13} /> Valid Layout
              </>
            ) : (
              <>
                <AlertCircle size={13} /> Constraint Violation
              </>
            )}
          </span>
        </div>

        {/* Quick Summary Grid */}
        <div className="debug-metrics-grid">
          <div className="metric-box">
            <span className="metric-label">Dimensions</span>
            <span className="metric-val">{layout.width} × {layout.height}</span>
          </div>
          <div className="metric-box">
            <span className="metric-label">Aspect Ratio</span>
            <span className="metric-val">{diagnostics.aspectRatio}:1</span>
          </div>
          <div className="metric-box">
            <span className="metric-label">Composition</span>
            <span className="metric-val highlight">{diagnostics.composition}</span>
          </div>
          <div className="metric-box">
            <span className="metric-label">Total Elements</span>
            <span className="metric-val">{diagnostics.totalElements}</span>
          </div>
          <div className="metric-box">
            <span className="metric-label">Visible</span>
            <span className="metric-val text-success">{diagnostics.visibleElements}</span>
          </div>
          <div className="metric-box">
            <span className="metric-label">Dropped</span>
            <span className="metric-val text-danger">{diagnostics.droppedElements}</span>
          </div>
          <div className="metric-box">
            <span className="metric-label">Compute Time</span>
            <span className="metric-val">{diagnostics.resolutionTimeMs} ms</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="debug-tabs-bar">
        <button
          onClick={() => setActiveTab('elements')}
          className={`debug-tab-btn ${activeTab === 'elements' ? 'active' : ''}`}
        >
          <Layers size={14} />
          <span>Resolved Elements ({elements.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('degradation')}
          className={`debug-tab-btn ${activeTab === 'degradation' ? 'active' : ''}`}
        >
          <ArrowDownRight size={14} />
          <span>Degradation Audit ({diagnostics.degradationSteps.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('solver')}
          className={`debug-tab-btn ${activeTab === 'solver' ? 'active' : ''}`}
        >
          <HelpCircle size={14} />
          <span>Solver Reasoning</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="debug-content-area">
        {activeTab === 'elements' && (
          <div className="elements-table-wrapper">
            <table className="debug-table">
              <thead>
                <tr>
                  <th>Element ID</th>
                  <th>Role</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Pos (X, Y)</th>
                  <th>Size (W × H)</th>
                  <th>Font Size</th>
                  <th>Reasoning</th>
                </tr>
              </thead>
              <tbody>
                {elements.map(el => (
                  <tr key={el.id} className={el.visible ? 'row-visible' : 'row-dropped'}>
                    <td className="font-mono font-bold">{el.id}</td>
                    <td>
                      <span className={`role-badge role-${el.role}`}>{el.role}</span>
                    </td>
                    <td>
                      <span className={`priority-badge p-${el.priority}`}>P{el.priority}</span>
                    </td>
                    <td>
                      <span className={`visibility-badge ${el.visible ? 'visible' : 'dropped'}`}>
                        {el.visible ? 'Visible' : 'Dropped'}
                      </span>
                    </td>
                    <td className="font-mono">
                      {el.visible ? `${el.x}, ${el.y}` : '—'}
                    </td>
                    <td className="font-mono">
                      {el.visible ? `${el.width} × ${el.height}` : '—'}
                    </td>
                    <td className="font-mono">
                      {el.fontSize ? `${el.fontSize}px` : '—'}
                      {el.truncation && <span className="trunc-tag">Ellipsis</span>}
                    </td>
                    <td className="reason-cell">{el.reason || 'Optimal placement'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'degradation' && (
          <div className="degradation-log-list">
            {diagnostics.degradationSteps.length === 0 ? (
              <div className="empty-log-state">
                <CheckCircle2 size={24} color="#34d399" />
                <p>Zero degradation required! All elements placed at preferred sizes.</p>
              </div>
            ) : (
              diagnostics.degradationSteps.map((step, idx) => (
                <div key={idx} className="degradation-step-item">
                  <div className="step-badge-col">
                    <span className="step-level-tag">Level {step.level}</span>
                    <span className={`step-action-tag action-${step.action}`}>
                      {step.action.toUpperCase()}
                    </span>
                  </div>
                  <div className="step-details-col">
                    <div className="step-header-line">
                      <span className="step-target font-mono">[{step.elementId}]</span>
                      <span className="step-priority">Priority {step.priority}</span>
                    </div>
                    <p className="step-reason">{step.reason}</p>
                    {step.detail && <p className="step-subdetail">{step.detail}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'solver' && (
          <div className="solver-notes-card">
            <h4 className="notes-heading">How this layout was derived:</h4>
            <ul className="notes-list">
              <li>
                <strong>Geometry Ratio:</strong> Usable aspect ratio is{' '}
                <code>{diagnostics.aspectRatio}</code>, triggering the{' '}
                <code>{diagnostics.composition}</code> composition algorithm.
              </li>
              <li>
                <strong>Safe Area Insets:</strong> Applied{' '}
                <code>
                  T:{layout.safeArea.top}px R:{layout.safeArea.right}px B:
                  {layout.safeArea.bottom}px L:{layout.safeArea.left}px
                </code>
                , leaving <code>{diagnostics.usableBounds.width} × {diagnostics.usableBounds.height}px</code> usable box.
              </li>
              <li>
                <strong>Priority Protection:</strong> Critical priority 1 items (Headline, Hero, CTA) are protected against dropping.
              </li>
              <li>
                <strong>Surface-Agnostic:</strong> No <code>surface.id</code> or <code>surface.name</code> string checking was performed.
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
