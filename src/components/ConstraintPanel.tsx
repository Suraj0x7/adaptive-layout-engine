import React, { useState } from 'react';
import { SurfaceProfile } from '../engine/types';
import { X, Sliders, Sparkles, Check } from 'lucide-react';

interface ConstraintPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCustomSurface: (surface: SurfaceProfile) => void;
}

export const ConstraintPanel: React.FC<ConstraintPanelProps> = ({
  isOpen,
  onClose,
  onApplyCustomSurface,
}) => {
  const [name, setName] = useState('Custom Interview Surface');
  const [width, setWidth] = useState(730);
  const [height, setHeight] = useState(410);
  const [safeTop, setSafeTop] = useState(20);
  const [safeRight, setSafeRight] = useState(30);
  const [safeBottom, setSafeBottom] = useState(20);
  const [safeLeft, setSafeLeft] = useState(30);
  const [minTextSize, setMinTextSize] = useState(16);
  const [minTapTarget, setMinTapTarget] = useState(48);
  const [touchOnly, setTouchOnly] = useState(true);
  const [viewingDistance, setViewingDistance] = useState<'near' | 'medium' | 'far'>('medium');
  const [density, setDensity] = useState<'compact' | 'normal' | 'spacious'>('normal');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const customSurface: SurfaceProfile = {
      id: `custom-${Date.now()}`,
      name: name || 'Custom Surface',
      width: Number(width),
      height: Number(height),
      safeArea: {
        top: Number(safeTop),
        right: Number(safeRight),
        bottom: Number(safeBottom),
        left: Number(safeLeft),
      },
      minTextSize: Number(minTextSize),
      minTapTarget: Number(minTapTarget),
      touchOnly,
      viewingDistance,
      density,
    };

    onApplyCustomSurface(customSurface);
    onClose();
  };

  const applyPreset = (preset: Partial<SurfaceProfile> & { name: string; width: number; height: number }) => {
    setName(preset.name);
    setWidth(preset.width);
    setHeight(preset.height);
    if (preset.safeArea) {
      setSafeTop(preset.safeArea.top);
      setSafeRight(preset.safeArea.right);
      setSafeBottom(preset.safeArea.bottom);
      setSafeLeft(preset.safeArea.left);
    }
    if (preset.minTextSize !== undefined) setMinTextSize(preset.minTextSize);
    if (preset.minTapTarget !== undefined) setMinTapTarget(preset.minTapTarget);
    if (preset.touchOnly !== undefined) setTouchOnly(preset.touchOnly);
    if (preset.viewingDistance) setViewingDistance(preset.viewingDistance);
    if (preset.density) setDensity(preset.density);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title-row">
            <Sliders size={20} className="text-accent" />
            <h3>Custom Surface Constraint Builder</h3>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={18} />
          </button>
        </div>

        <p className="modal-subtitle">
          Test the layout engine on any arbitrary dimensions and physical constraints. The core resolver will adapt without any code changes.
        </p>

        {/* Quick Presets for interview demos */}
        <div className="presets-bar">
          <span className="presets-label">
            <Sparkles size={14} /> Quick Presets:
          </span>
          <button
            type="button"
            className="preset-pill"
            onClick={() =>
              applyPreset({
                name: 'Interview Test Surface (730×410)',
                width: 730,
                height: 410,
                safeArea: { top: 20, right: 30, bottom: 20, left: 30 },
                minTextSize: 18,
                minTapTarget: 48,
                touchOnly: true,
                viewingDistance: 'medium',
              })
            }
          >
            Interview (730×410)
          </button>
          <button
            type="button"
            className="preset-pill"
            onClick={() =>
              applyPreset({
                name: 'Smart Watch (240×240)',
                width: 240,
                height: 240,
                safeArea: { top: 12, right: 12, bottom: 12, left: 12 },
                minTextSize: 10,
                minTapTarget: 36,
                touchOnly: true,
                viewingDistance: 'near',
                density: 'compact',
              })
            }
          >
            Smart Watch (240×240)
          </button>
          <button
            type="button"
            className="preset-pill"
            onClick={() =>
              applyPreset({
                name: 'Ultrawide Billboard (2560×400)',
                width: 2560,
                height: 400,
                safeArea: { top: 30, right: 120, bottom: 30, left: 120 },
                minTextSize: 26,
                minTapTarget: 0,
                touchOnly: false,
                viewingDistance: 'far',
                density: 'spacious',
              })
            }
          >
            Billboard (2560×400)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="custom-surface-form">
          <div className="form-group">
            <label>Surface Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>Width (px)</label>
              <input
                type="number"
                min="100"
                max="4000"
                value={width}
                onChange={e => setWidth(Number(e.target.value))}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label>Height (px)</label>
              <input
                type="number"
                min="100"
                max="4000"
                value={height}
                onChange={e => setHeight(Number(e.target.value))}
                className="form-input"
                required
              />
            </div>
          </div>

          <div className="safe-area-group">
            <label className="group-label">Safe Area Insets (px)</label>
            <div className="safe-area-inputs-grid">
              <div>
                <span className="field-sublabel">Top</span>
                <input
                  type="number"
                  min="0"
                  value={safeTop}
                  onChange={e => setSafeTop(Number(e.target.value))}
                  className="form-input"
                />
              </div>
              <div>
                <span className="field-sublabel">Right</span>
                <input
                  type="number"
                  min="0"
                  value={safeRight}
                  onChange={e => setSafeRight(Number(e.target.value))}
                  className="form-input"
                />
              </div>
              <div>
                <span className="field-sublabel">Bottom</span>
                <input
                  type="number"
                  min="0"
                  value={safeBottom}
                  onChange={e => setSafeBottom(Number(e.target.value))}
                  className="form-input"
                />
              </div>
              <div>
                <span className="field-sublabel">Left</span>
                <input
                  type="number"
                  min="0"
                  value={safeLeft}
                  onChange={e => setSafeLeft(Number(e.target.value))}
                  className="form-input"
                />
              </div>
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>Min Text Size (px)</label>
              <input
                type="number"
                min="8"
                max="48"
                value={minTextSize}
                onChange={e => setMinTextSize(Number(e.target.value))}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Min Tap Target (px)</label>
              <input
                type="number"
                min="0"
                max="96"
                value={minTapTarget}
                onChange={e => setMinTapTarget(Number(e.target.value))}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row-3">
            <div className="form-group">
              <label>Viewing Distance</label>
              <select
                value={viewingDistance}
                onChange={e => setViewingDistance(e.target.value as any)}
                className="form-select"
              >
                <option value="near">Near (Mobile/Tablet)</option>
                <option value="medium">Medium (Desktop/Kiosk)</option>
                <option value="far">Far (TV / Billboard)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Density</label>
              <select
                value={density}
                onChange={e => setDensity(e.target.value as any)}
                className="form-select"
              >
                <option value="compact">Compact</option>
                <option value="normal">Normal</option>
                <option value="spacious">Spacious</option>
              </select>
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={touchOnly}
                  onChange={e => setTouchOnly(e.target.checked)}
                />
                <span>Touch Enabled</span>
              </label>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <Check size={16} />
              <span>Resolve Custom Surface</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
