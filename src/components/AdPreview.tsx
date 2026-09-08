import React, { useRef, useState, useEffect } from 'react';
import { ResolvedLayout } from '../engine/types';
import { DomRenderer } from '../renderers/DomRenderer';
import { Eye, Shield, ZoomIn, Download, CheckCircle, Compass } from 'lucide-react';

interface AdPreviewProps {
  layout: ResolvedLayout;
  showBounds: boolean;
  onToggleBounds: (val: boolean) => void;
  showSafeArea: boolean;
  onToggleSafeArea: (val: boolean) => void;
}

export const AdPreview: React.FC<AdPreviewProps> = ({
  layout,
  showBounds,
  onToggleBounds,
  showSafeArea,
  onToggleSafeArea,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  const [zoomMode, setZoomMode] = useState<'fit' | '100%'>('fit');
  const [copied, setCopied] = useState(false);

  // Responsive scale calculation to fit surface cleanly inside container
  useEffect(() => {
    if (zoomMode === '100%') {
      setScale(1);
      return;
    }

    const updateScale = () => {
      if (!containerRef.current) return;
      const padding = 48;
      const availW = Math.max(200, containerRef.current.clientWidth - padding);
      const availH = Math.max(200, containerRef.current.clientHeight - padding);

      const scaleW = availW / layout.width;
      const scaleH = availH / layout.height;
      const computedScale = Math.min(1.0, scaleW, scaleH);
      setScale(Math.max(0.2, Number(computedScale.toFixed(3))));
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [layout.width, layout.height, zoomMode]);

  const handleExportJSON = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(layout, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `resolved-layout-${layout.surfaceId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCompositionColor = (type: string) => {
    switch (type) {
      case 'horizontal':
        return '#38bdf8';
      case 'balanced':
        return '#a855f7';
      case 'vertical':
      default:
        return '#34d399';
    }
  };

  return (
    <div className="ad-preview-card">
      {/* Top Preview Toolbar */}
      <div className="preview-toolbar">
        <div className="toolbar-left">
          <div className="surface-status-tag">
            <span
              className="composition-indicator"
              style={{ backgroundColor: getCompositionColor(layout.orientation) }}
            />
            <Compass size={14} style={{ marginRight: '6px' }} />
            <span className="orientation-text">
              {layout.orientation.toUpperCase()} COMPOSITION
            </span>
          </div>

          <span className="surface-res-badge">
            {layout.width} × {layout.height}px (Ratio: {layout.diagnostics.aspectRatio})
          </span>
        </div>

        <div className="toolbar-right">
          {/* Toggle Layout Bounds */}
          <button
            onClick={() => onToggleBounds(!showBounds)}
            className={`tool-btn ${showBounds ? 'tool-active' : ''}`}
            title="Toggle Visual Layout Bounding Boxes & IDs"
          >
            <Eye size={15} />
            <span>Show Bounds</span>
          </button>

          {/* Toggle Safe Area */}
          <button
            onClick={() => onToggleSafeArea(!showSafeArea)}
            className={`tool-btn ${showSafeArea ? 'tool-active' : ''}`}
            title="Toggle Safe Area Overlay"
          >
            <Shield size={15} />
            <span>Safe Area</span>
          </button>

          {/* Toggle Zoom Mode */}
          <button
            onClick={() => setZoomMode(zoomMode === 'fit' ? '100%' : 'fit')}
            className={`tool-btn ${zoomMode === '100%' ? 'tool-active' : ''}`}
            title="Toggle between Auto-Fit and 100% actual scale"
          >
            <ZoomIn size={15} />
            <span>{zoomMode === 'fit' ? `Fit (${Math.round(scale * 100)}%)` : '100%'}</span>
          </button>

          {/* Download JSON */}
          <button
            onClick={handleExportJSON}
            className="tool-btn export-btn"
            title="Download Resolved Layout JSON"
          >
            {copied ? <CheckCircle size={15} color="#34d399" /> : <Download size={15} />}
            <span>{copied ? 'Exported!' : 'Export JSON'}</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport Area */}
      <div ref={containerRef} className="preview-stage-area">
        <DomRenderer
          layout={layout}
          showBounds={showBounds}
          showSafeArea={showSafeArea}
          scale={scale}
        />
      </div>

      {/* Footer Info Bar */}
      <div className="preview-footer-bar">
        <span className="footer-stat">
          Safe Insets: T:{layout.safeArea.top} R:{layout.safeArea.right} B:{layout.safeArea.bottom} L:{layout.safeArea.left}px
        </span>
        <span className="footer-stat">
          Usable Area: {layout.diagnostics.usableBounds.width} × {layout.diagnostics.usableBounds.height}px
        </span>
        <span className="footer-stat highlight-stat">
          Resolved in {layout.diagnostics.resolutionTimeMs}ms
        </span>
      </div>
    </div>
  );
};
