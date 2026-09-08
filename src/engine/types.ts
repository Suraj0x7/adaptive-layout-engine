/**
 * Core domain types for the Adaptive Layout Engine
 * Framework-independent TypeScript definitions.
 */

export type ElementType = 'text' | 'image' | 'button';

export type ElementRole = 'primary' | 'secondary' | 'hero' | 'action' | 'branding';

/**
 * Priority levels:
 * 1 = Highest (critical hero, headline, action)
 * 2 = Medium (price, supporting copy)
 * 3 = Lowest (branding logo, disclaimers, decorative badges)
 */
export type ElementPriority = 1 | 2 | 3;

export interface BaseElement {
  id: string;
  role: ElementRole;
  priority: ElementPriority;
}

export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  styleHint?: {
    accent?: boolean;
    badge?: boolean;
  };
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  alt?: string;
  aspectRatio?: number; // width / height, e.g. 1 for square, 1.33 for 4:3
}

export interface ButtonElement extends BaseElement {
  type: 'button';
  content: string;
  variant?: 'primary' | 'secondary';
}

export type AdElement = TextElement | ImageElement | ButtonElement;

export interface AdSpec {
  id: string;
  name?: string;
  elements: AdElement[];
}

export interface SafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SurfaceProfile {
  id: string;
  name: string;
  width: number;
  height: number;
  safeArea?: SafeArea;
  minTextSize?: number;
  minTapTarget?: number;
  touchOnly?: boolean;
  viewingDistance?: 'near' | 'medium' | 'far';
  maxElements?: number;
  density?: 'compact' | 'normal' | 'spacious';
}

export type CompositionType = 'vertical' | 'horizontal' | 'balanced';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DegradationDecision {
  elementId: string;
  action: 'removed' | 'shrunk' | 'truncated' | 'spacing_reduced' | 'font_reduced';
  reason: string;
  priority: ElementPriority;
  level: number;
  detail?: string;
}

export interface ResolvedElement extends Rect {
  id: string;
  type: ElementType;
  role: ElementRole;
  priority: ElementPriority;
  visible: boolean;
  fontSize?: number;
  truncation?: boolean;
  degradationLevel?: number;
  reason?: string;
  // Raw content payload for the renderer to display without re-indexing
  text?: string;
  src?: string;
  alt?: string;
  buttonLabel?: string;
  aspectRatio?: number;
  styleHint?: {
    accent?: boolean;
    badge?: boolean;
  };
  variant?: 'primary' | 'secondary';
}

export interface LayoutDiagnostics {
  aspectRatio: number;
  usableBounds: Rect;
  totalElements: number;
  visibleElements: number;
  droppedElements: number;
  composition: CompositionType;
  degradationSteps: DegradationDecision[];
  isValid: boolean;
  validationErrors: string[];
  resolutionTimeMs: number;
}

export interface ResolvedLayout {
  surfaceId: string;
  surfaceName: string;
  width: number;
  height: number;
  safeArea: SafeArea;
  elements: ResolvedElement[];
  orientation: CompositionType;
  diagnostics: LayoutDiagnostics;
}
