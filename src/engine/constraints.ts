/**
 * Constraint modeling, candidate sizing, and element metrics calculation.
 * Translates abstract AdElements into normalized layout candidates with physical bounds.
 */

import { AdElement, ElementPriority, ElementRole, ElementType, SurfaceProfile } from './types';

export interface ElementConstraints {
  minWidth: number;
  minHeight: number;
  prefWidth: number;
  prefHeight: number;
  maxWidth: number;
  maxHeight: number;
  flexGrow: number;
  flexShrink: number;
  canDrop: boolean;
  minFontSize?: number;
  prefFontSize?: number;
}

export interface LayoutCandidate {
  id: string;
  type: ElementType;
  role: ElementRole;
  priority: ElementPriority;
  rawElement: AdElement;
  constraints: ElementConstraints;
  currentWidth: number;
  currentHeight: number;
  currentFontSize?: number;
  isTruncated: boolean;
  isVisible: boolean;
  degradationLevel: number;
}

/**
 * Calculates viewing distance multiplier for font sizing and readability
 */
export function getDistanceMultiplier(viewingDistance?: 'near' | 'medium' | 'far'): number {
  switch (viewingDistance) {
    case 'far':
      return 1.65;
    case 'medium':
      return 1.25;
    case 'near':
    default:
      return 1.0;
  }
}

/**
 * Calculates density-based spacing and padding
 */
export function getDensityMetrics(density?: 'compact' | 'normal' | 'spacious'): { gap: number; padding: number } {
  switch (density) {
    case 'compact':
      return { gap: 8, padding: 10 };
    case 'spacious':
      return { gap: 24, padding: 32 };
    case 'normal':
    default:
      return { gap: 14, padding: 18 };
  }
}

/**
 * Estimates text box dimensions based on content, font size, and max container width
 */
export function estimateTextDimensions(
  text: string,
  fontSize: number,
  containerWidth: number
): { width: number; height: number; lines: number } {
  // Average proportional width for modern sans-serif fonts is ~0.55 * fontSize
  const charWidth = fontSize * 0.55;
  const totalTextWidth = text.length * charWidth;
  const paddingH = 8;
  const availableWidth = Math.max(60, containerWidth - paddingH);

  const lines = Math.max(1, Math.ceil(totalTextWidth / availableWidth));
  // Line height ~ 1.25x
  const height = Math.round(lines * fontSize * 1.35 + 6);
  const width = Math.min(containerWidth, Math.ceil(Math.min(totalTextWidth + paddingH, availableWidth)));

  return { width, height, lines };
}

/**
 * Derives normalized layout candidate from raw element and surface constraints
 */
export function createLayoutCandidate(
  element: AdElement,
  surface: SurfaceProfile,
  usableWidth: number,
  usableHeight: number
): LayoutCandidate {
  const distMult = getDistanceMultiplier(surface.viewingDistance);
  const surfaceMinText = surface.minTextSize ?? 11;
  const minTap = surface.touchOnly || surface.minTapTarget ? (surface.minTapTarget ?? 44) : 32;

  let constraints: ElementConstraints;
  let prefFontSize: number | undefined;
  let minFontSize: number | undefined;

  switch (element.type) {
    case 'text': {
      if (element.role === 'primary') {
        // Headline
        prefFontSize = Math.round(Math.max(surfaceMinText, 24 * distMult));
        minFontSize = Math.max(surfaceMinText, 14);
        const est = estimateTextDimensions(element.content, prefFontSize, usableWidth * 0.9);
        constraints = {
          minWidth: 80,
          minHeight: Math.max(24, Math.round(minFontSize * 1.3)),
          prefWidth: est.width,
          prefHeight: est.height,
          maxWidth: usableWidth,
          maxHeight: usableHeight * 0.45,
          flexGrow: 1,
          flexShrink: 1,
          canDrop: false, // Primary content should not be dropped
          minFontSize,
          prefFontSize,
        };
      } else {
        // Secondary text (price, badge, supporting)
        prefFontSize = Math.round(Math.max(surfaceMinText, 18 * distMult));
        minFontSize = Math.max(surfaceMinText, 11);
        const est = estimateTextDimensions(element.content, prefFontSize, usableWidth * 0.5);
        constraints = {
          minWidth: 50,
          minHeight: Math.max(20, Math.round(minFontSize * 1.2)),
          prefWidth: Math.max(60, est.width),
          prefHeight: est.height,
          maxWidth: usableWidth * 0.6,
          maxHeight: usableHeight * 0.25,
          flexGrow: 0.5,
          flexShrink: 2,
          canDrop: element.priority >= 3,
          minFontSize,
          prefFontSize,
        };
      }
      break;
    }

    case 'button': {
      // Action button
      prefFontSize = Math.round(Math.max(surfaceMinText, 15 * distMult));
      minFontSize = Math.max(surfaceMinText, 12);
      const buttonTextWidth = element.content.length * (prefFontSize * 0.6) + 32;

      // Ensure button respects minimum tap target on touch surfaces
      const requiredMinW = Math.max(buttonTextWidth, minTap);
      const requiredMinH = minTap;

      constraints = {
        minWidth: requiredMinW,
        minHeight: requiredMinH,
        prefWidth: Math.min(usableWidth * 0.7, Math.max(requiredMinW, 130 * distMult)),
        prefHeight: Math.max(requiredMinH, Math.round(44 * (distMult > 1.2 ? 1.2 : 1.0))),
        maxWidth: Math.min(usableWidth, 240 * distMult),
        maxHeight: Math.max(requiredMinH, 64),
        flexGrow: 0,
        flexShrink: 0, // CTA is protected
        canDrop: false,
        minFontSize,
        prefFontSize,
      };
      break;
    }

    case 'image': {
      if (element.role === 'hero') {
        // Hero product image
        const aspect = element.aspectRatio ?? 1.0;
        const targetSide = Math.min(usableWidth * 0.65, usableHeight * 0.65);
        const prefW = Math.round(targetSide * (aspect >= 1 ? 1 : aspect));
        const prefH = Math.round(targetSide / (aspect >= 1 ? aspect : 1));

        constraints = {
          minWidth: Math.min(60, usableWidth * 0.2),
          minHeight: Math.min(60, usableHeight * 0.2),
          prefWidth: Math.min(usableWidth, prefW),
          prefHeight: Math.min(usableHeight, prefH),
          maxWidth: usableWidth,
          maxHeight: usableHeight * 0.8,
          flexGrow: 2,
          flexShrink: 1,
          canDrop: false, // Hero is priority 1, must be preserved
        };
      } else {
        // Branding / Logo
        const aspect = element.aspectRatio ?? 3.5;
        const prefW = Math.round(Math.min(usableWidth * 0.35, 160 * distMult));
        const prefH = Math.round(prefW / aspect);

        constraints = {
          minWidth: 40,
          minHeight: Math.max(12, Math.round(40 / aspect)),
          prefWidth: prefW,
          prefHeight: prefH,
          maxWidth: Math.min(usableWidth * 0.45, 200),
          maxHeight: Math.min(usableHeight * 0.3, 60),
          flexGrow: 0,
          flexShrink: 3,
          canDrop: element.priority >= 3,
        };
      }
      break;
    }
  }

  return {
    id: element.id,
    type: element.type,
    role: element.role,
    priority: element.priority,
    rawElement: element,
    constraints,
    currentWidth: constraints.prefWidth,
    currentHeight: constraints.prefHeight,
    currentFontSize: prefFontSize,
    isTruncated: false,
    isVisible: true,
    degradationLevel: 0,
  };
}
