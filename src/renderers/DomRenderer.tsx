import React from 'react';
import { ResolvedLayout, ResolvedElement } from '../engine/types';

interface DomRendererProps {
  layout: ResolvedLayout;
  showBounds?: boolean;
  showSafeArea?: boolean;
  scale?: number;
}

export const DomRenderer: React.FC<DomRendererProps> = ({
  layout,
  showBounds = false,
  showSafeArea = true,
  scale = 1,
}) => {
  const { width, height, safeArea, elements } = layout;
  const visibleElements = elements.filter(el => el.visible);

  return (
    <div
      className="ad-render-viewport"
      style={{
        width: `${width * scale}px`,
        height: `${height * scale}px`,
        position: 'relative',
        transformOrigin: 'top left',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
        borderRadius: width > 400 && height > 300 ? '16px' : '8px',
      }}
    >
      <div
        className="ad-surface-container"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'absolute',
          top: 0,
          left: 0,
          background: 'linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e1b4b 100%)',
          color: '#f8fafc',
          userSelect: 'none',
        }}
      >
        {/* Subtle Background Accent Pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.08,
            backgroundImage:
              'radial-gradient(#6366f1 1px, transparent 1px), radial-gradient(#a855f7 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            backgroundPosition: '0 0, 12px 12px',
            pointerEvents: 'none',
          }}
        />

        {/* Optional Safe Area Guide */}
        {showSafeArea && safeArea && (
          <div
            className="safe-area-overlay"
            style={{
              position: 'absolute',
              top: `${safeArea.top}px`,
              left: `${safeArea.left}px`,
              width: `${width - safeArea.left - safeArea.right}px`,
              height: `${height - safeArea.top - safeArea.bottom}px`,
              border: '1px dashed rgba(234, 179, 8, 0.35)',
              borderRadius: '4px',
              pointerEvents: 'none',
              zIndex: 99,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '2px',
                right: '4px',
                fontSize: '9px',
                fontWeight: 600,
                color: 'rgba(234, 179, 8, 0.7)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Safe Area
            </span>
          </div>
        )}

        {/* Resolved Elements Rendered at exact coordinates */}
        {visibleElements.map(el => (
          <RenderResolvedElement
            key={el.id}
            element={el}
            showBounds={showBounds}
          />
        ))}
      </div>
    </div>
  );
};

interface ElementProps {
  element: ResolvedElement;
  showBounds: boolean;
}

const RenderResolvedElement: React.FC<ElementProps> = ({ element, showBounds }) => {
  const {
    id,
    type,
    role,
    x,
    y,
    width,
    height,
    fontSize,
    truncation,
    text,
    src,
    alt,
    buttonLabel,
    styleHint,
  } = element;

  // Base element placement style using absolute resolved coordinates
  const elementStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${x}px`,
    top: `${y}px`,
    width: `${width}px`,
    height: `${height}px`,
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: role === 'hero' || role === 'action' || role === 'branding' ? 'center' : 'flex-start',
    zIndex: role === 'action' ? 20 : role === 'hero' ? 10 : 5,
    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
  };

  const boundsColorMap: Record<string, string> = {
    hero: '#38bdf8',
    primary: '#a855f7',
    secondary: '#34d399',
    action: '#f43f5e',
    branding: '#fbbf24',
  };

  const boundColor = boundsColorMap[role] || '#818cf8';

  return (
    <div style={elementStyle}>
      {/* Visual Debug Bounds overlay */}
      {showBounds && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            border: `1.5px dashed ${boundColor}`,
            backgroundColor: `${boundColor}10`,
            borderRadius: '4px',
            pointerEvents: 'none',
            zIndex: 100,
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: '-16px',
              left: '0px',
              backgroundColor: boundColor,
              color: '#090d16',
              fontSize: '10px',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '3px',
              whiteSpace: 'nowrap',
              lineHeight: '13px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            [{role}:{id}] {width}x{height}
          </span>
        </div>
      )}

      {/* Render Text Elements */}
      {type === 'text' && (
        <div
          style={{
            width: '100%',
            height: '100%',
            fontSize: fontSize ? `${fontSize}px` : '16px',
            lineHeight: 1.25,
            fontWeight: role === 'primary' ? 800 : 600,
            color: styleHint?.accent ? '#38bdf8' : '#f8fafc',
            overflow: 'hidden',
            textOverflow: truncation ? 'ellipsis' : 'clip',
            whiteSpace: truncation ? 'nowrap' : 'normal',
            display: 'flex',
            alignItems: 'center',
            letterSpacing: role === 'primary' ? '-0.02em' : 'normal',
            textShadow: role === 'primary' ? '0 2px 10px rgba(0,0,0,0.5)' : 'none',
          }}
        >
          {styleHint?.badge ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(99, 102, 241, 0.2) 100%)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                color: '#38bdf8',
                padding: '4px 10px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: `${fontSize}px`,
                letterSpacing: '0.02em',
              }}
            >
              {text}
            </span>
          ) : (
            text
          )}
        </div>
      )}

      {/* Render Image Elements (Hero / Branding) */}
      {type === 'image' && src && (
        <img
          src={src}
          alt={alt || id}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: role === 'hero' ? 'drop-shadow(0 10px 25px rgba(99, 102, 241, 0.25))' : 'none',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Render Button / Action Element */}
      {type === 'button' && (
        <button
          className="ad-interactive-cta"
          style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '9999px',
            fontSize: fontSize ? `${fontSize}px` : '15px',
            fontWeight: 700,
            letterSpacing: '0.02em',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 16px',
            boxShadow: '0 8px 20px -4px rgba(99, 102, 241, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.3)',
            outline: 'none',
          }}
        >
          <span>{buttonLabel || 'Learn More'}</span>
          <svg
            style={{ marginLeft: '8px', width: '1em', height: '1em' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      )}
    </div>
  );
};
