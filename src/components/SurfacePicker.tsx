import React from 'react';
import { SurfaceProfile } from '../engine/types';
import { Smartphone, Monitor, Tv, Layers, AlertTriangle, PlusCircle } from 'lucide-react';

interface SurfacePickerProps {
  surfaces: SurfaceProfile[];
  selectedSurfaceId: string;
  onSelectSurface: (surface: SurfaceProfile) => void;
  onOpenCustomModal: () => void;
}

export const SurfacePicker: React.FC<SurfacePickerProps> = ({
  surfaces,
  selectedSurfaceId,
  onSelectSurface,
  onOpenCustomModal,
}) => {
  const getIcon = (id: string, name: string) => {
    const lower = (id + name).toLowerCase();
    if (lower.includes('portrait')) return <Smartphone size={18} />;
    if (lower.includes('landscape')) return <Smartphone size={18} style={{ transform: 'rotate(90deg)' }} />;
    if (lower.includes('broadcast')) return <Tv size={18} />;
    if (lower.includes('kiosk')) return <Monitor size={18} />;
    if (lower.includes('constrained')) return <AlertTriangle size={18} />;
    return <Layers size={18} />;
  };

  return (
    <div className="surface-picker-wrapper">
      <div className="surface-picker-label-row">
        <span className="picker-title">Select Target Surface</span>
        <span className="picker-hint">Same Ad Spec, resolved automatically</span>
      </div>

      <div className="surface-tabs">
        {surfaces.map(surface => {
          const isSelected = surface.id === selectedSurfaceId;
          const aspect = (surface.width / surface.height).toFixed(2);

          return (
            <button
              key={surface.id}
              onClick={() => onSelectSurface(surface)}
              className={`surface-tab-btn ${isSelected ? 'active' : ''}`}
            >
              <div className="tab-icon-row">
                <span className="tab-icon">{getIcon(surface.id, surface.name)}</span>
                <span className="tab-name">{surface.name}</span>
              </div>
              <div className="tab-meta-row">
                <span className="tab-dims">{surface.width} × {surface.height}</span>
                <span className="tab-aspect">{aspect}:1</span>
              </div>
            </button>
          );
        })}

        {/* Custom Surface Trigger */}
        <button
          onClick={onOpenCustomModal}
          className="surface-tab-btn custom-tab-btn"
          title="Create an unknown custom surface"
        >
          <div className="tab-icon-row">
            <PlusCircle size={18} className="text-accent" />
            <span className="tab-name">Custom Surface</span>
          </div>
          <div className="tab-meta-row">
            <span className="tab-dims">Test Any Constraint</span>
            <span className="tab-aspect">Custom</span>
          </div>
        </button>
      </div>
    </div>
  );
};
