/**
 * Pre-defined surface profiles.
 * Notice: Surfaces are purely declarative configurations of geometric and physical constraints.
 * The layout engine never checks surface.id or surface.name to branch logic.
 */

import { SurfaceProfile } from './types';

export const SURFACE_PROFILES: Record<string, SurfaceProfile> = {
  mobilePortrait: {
    id: 'mobile-portrait',
    name: 'Mobile Portrait',
    width: 360,
    height: 640,
    safeArea: {
      top: 24,
      right: 16,
      bottom: 24,
      left: 16,
    },
    minTextSize: 12,
    minTapTarget: 44,
    touchOnly: true,
    viewingDistance: 'near',
    density: 'compact',
  },

  mobileLandscape: {
    id: 'mobile-landscape',
    name: 'Mobile Landscape',
    width: 640,
    height: 360,
    safeArea: {
      top: 16,
      right: 32,
      bottom: 16,
      left: 32,
    },
    minTextSize: 12,
    minTapTarget: 44,
    touchOnly: true,
    viewingDistance: 'near',
    density: 'compact',
  },

  broadcastLowerThird: {
    id: 'broadcast-lower-third',
    name: 'Broadcast Lower Third',
    width: 1920,
    height: 250,
    safeArea: {
      top: 20,
      right: 80,
      bottom: 20,
      left: 80,
    },
    minTextSize: 22, // Large minimum text size for TV viewing distance
    minTapTarget: 0,  // Non-interactive TV overlay
    touchOnly: false,
    viewingDistance: 'far',
    density: 'normal',
  },

  retailKiosk: {
    id: 'retail-kiosk',
    name: 'Retail Kiosk',
    width: 1080,
    height: 1080,
    safeArea: {
      top: 40,
      right: 40,
      bottom: 40,
      left: 40,
    },
    minTextSize: 18,
    minTapTarget: 60, // Extra large interactive hit target for public kiosks
    touchOnly: true,
    viewingDistance: 'medium',
    density: 'spacious',
  },

  constrainedSmall: {
    id: 'constrained-small',
    name: 'Constrained Small Display',
    width: 280,
    height: 200,
    safeArea: {
      top: 8,
      right: 8,
      bottom: 8,
      left: 8,
    },
    minTextSize: 10,
    minTapTarget: 36,
    touchOnly: true,
    viewingDistance: 'near',
    maxElements: 4,
    density: 'compact',
  },
};

export const DEFAULT_SURFACES_LIST: SurfaceProfile[] = Object.values(SURFACE_PROFILES);
