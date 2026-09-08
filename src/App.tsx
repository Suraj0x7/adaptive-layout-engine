import React, { useState, useMemo } from 'react';
import { SurfaceProfile } from './engine/types';
import { DEFAULT_SURFACES_LIST } from './engine/surfaces';
import { DEMO_AD } from './data/demoAd';
import { resolveLayout } from './engine/resolver';
import { SurfacePicker } from './components/SurfacePicker';
import { AdPreview } from './components/AdPreview';
import { DebugPanel } from './components/DebugPanel';
import { ConstraintPanel } from './components/ConstraintPanel';
import { LayoutGrid, Cpu, CheckCircle2 } from 'lucide-react';
import './styles.css';

export const App: React.FC = () => {
  const [surfaces, setSurfaces] = useState<SurfaceProfile[]>(DEFAULT_SURFACES_LIST);
  const [selectedSurface, setSelectedSurface] = useState<SurfaceProfile>(DEFAULT_SURFACES_LIST[0]);
  const [showBounds, setShowBounds] = useState<boolean>(false);
  const [showSafeArea, setShowSafeArea] = useState<boolean>(true);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);

  // Pure generic layout resolution run whenever selectedSurface or adSpec changes
  const resolvedLayout = useMemo(() => {
    return resolveLayout(DEMO_AD, selectedSurface);
  }, [selectedSurface]);

  const handleApplyCustomSurface = (newSurface: SurfaceProfile) => {
    setSurfaces(prev => [...prev, newSurface]);
    setSelectedSurface(newSurface);
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-icon-box">
            <LayoutGrid size={24} />
          </div>
          <div>
            <h1 className="brand-title">Adaptive Layout Engine</h1>
            <p className="brand-subtitle">
              One ad specification. Multiple surfaces. Constraint-driven composition.
            </p>
          </div>
        </div>

        <div className="header-meta-badges">
          <span className="meta-pill accent">
            <Cpu size={13} /> Pure TS Constraint Solver
          </span>
          <span className="meta-pill">
            <CheckCircle2 size={13} color="#34d399" /> Zero Hardcoded Surfaces
          </span>
        </div>
      </header>

      {/* Surface Selector Bar */}
      <SurfacePicker
        surfaces={surfaces}
        selectedSurfaceId={selectedSurface.id}
        onSelectSurface={setSelectedSurface}
        onOpenCustomModal={() => setIsCustomModalOpen(true)}
      />

      {/* Main Preview Container */}
      <AdPreview
        layout={resolvedLayout}
        showBounds={showBounds}
        onToggleBounds={setShowBounds}
        showSafeArea={showSafeArea}
        onToggleSafeArea={setShowSafeArea}
      />

      {/* Live Engineering Debug Panel */}
      <DebugPanel layout={resolvedLayout} />

      {/* Custom Surface Modal for Interview Demonstrations */}
      <ConstraintPanel
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onApplyCustomSurface={handleApplyCustomSurface}
      />
    </div>
  );
};

export default App;
