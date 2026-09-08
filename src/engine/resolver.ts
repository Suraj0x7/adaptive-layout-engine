/**
 * Constraint-Based Adaptive Layout Engine Core Resolver.
 *
 * CRITICAL ARCHITECTURAL PRINCIPLE:
 * This algorithm contains ZERO surface-id or surface-name branches.
 * All decisions are derived purely from:
 * - Usable geometry (width, height, aspect ratio)
 * - Safe areas
 * - Content roles (hero, primary, secondary, action, branding)
 * - Content priorities (1, 2, 3)
 * - Physical constraints (minTextSize, minTapTarget, viewingDistance, density)
 */

import {
  AdSpec,
  CompositionType,
  LayoutDiagnostics,
  Rect,
  ResolvedElement,
  ResolvedLayout,
  SurfaceProfile,
} from './types';
import { validateAdSpec, validateSurfaceProfile } from './validation';
import { calculateUsableBounds, findOverlaps, getAspectRatio, isInsideBounds } from './geometry';
import { createLayoutCandidate, getDensityMetrics, LayoutCandidate } from './constraints';
import { applyDegradationLevel, MAX_DEGRADATION_LEVEL } from './degradation';

/**
 * Classifies composition orientation purely from aspect ratio.
 */
export function classifyComposition(aspectRatio: number): CompositionType {
  if (aspectRatio < 0.85) {
    return 'vertical'; // Narrow / tall display
  }
  if (aspectRatio > 1.9) {
    return 'horizontal'; // Wide ribbon / lower third
  }
  return 'balanced'; // Near-square / kiosk / medium aspect
}

/**
 * Builds ResolvedElement from candidate and calculated coordinates.
 */
function toResolvedElement(
  cand: LayoutCandidate,
  rect: Rect,
  reason: string,
  extra?: Partial<ResolvedElement>
): ResolvedElement {
  const raw = cand.rawElement;
  return {
    id: cand.id,
    type: cand.type,
    role: cand.role,
    priority: cand.priority,
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    visible: cand.isVisible,
    fontSize: cand.currentFontSize,
    truncation: cand.isTruncated,
    degradationLevel: cand.degradationLevel,
    reason,
    text: raw.type === 'text' ? raw.content : undefined,
    src: raw.type === 'image' ? raw.src : undefined,
    alt: raw.type === 'image' ? raw.alt : undefined,
    aspectRatio: raw.type === 'image' ? raw.aspectRatio : undefined,
    buttonLabel: raw.type === 'button' ? raw.content : undefined,
    styleHint: raw.type === 'text' ? raw.styleHint : undefined,
    variant: raw.type === 'button' ? raw.variant : undefined,
    ...extra,
  };
}

/**
 * Attempts placement for a vertical composition (tall / narrow).
 */
function solveVertical(
  candidates: LayoutCandidate[],
  bounds: Rect,
  gap: number,
  padding: number
): { elements: ResolvedElement[]; fits: boolean } {
  const visible = candidates.filter(c => c.isVisible);
  const elements: ResolvedElement[] = [];

  // Group by role order for vertical flow:
  // [Branding (top)] -> [Hero image] -> [Primary headline] -> [Secondary copy/price] -> [Action CTA (bottom)]
  const branding = visible.find(c => c.role === 'branding');
  const hero = visible.find(c => c.role === 'hero');
  const primary = visible.find(c => c.role === 'primary');
  const secondary = visible.find(c => c.role === 'secondary');
  const action = visible.find(c => c.role === 'action');

  const ordered: LayoutCandidate[] = [];
  if (branding) ordered.push(branding);
  if (hero) ordered.push(hero);
  if (primary) ordered.push(primary);
  if (secondary) ordered.push(secondary);
  if (action) ordered.push(action);

  // Remaining visible elements (if any custom roles exist)
  for (const c of visible) {
    if (!ordered.includes(c)) ordered.push(c);
  }

  const contentW = bounds.width - padding * 2;
  const contentH = bounds.height - padding * 2;

  // Calculate required heights
  let totalFixedH = 0;
  let heroCandidate: LayoutCandidate | undefined;

  for (const cand of ordered) {
    if (cand.role === 'hero') {
      heroCandidate = cand;
    } else {
      totalFixedH += cand.currentHeight;
    }
  }

  const totalGaps = (ordered.length - 1) * gap;
  const remainingForHero = contentH - totalFixedH - totalGaps;

  // Check if minimum fixed items exceed total height
  if (remainingForHero < 0 && heroCandidate) {
    return { elements: [], fits: false };
  }

  // Position sequentially from top to bottom
  let currentY = bounds.y + padding;

  for (const cand of ordered) {
    let elW = cand.currentWidth;
    let elH = cand.currentHeight;
    let elX = bounds.x + padding;
    let reason = 'Vertical stack flow';

    if (cand.role === 'hero') {
      // Allocate available vertical budget to hero, bounded by aspect ratio
      const aspect = cand.rawElement.type === 'image' && cand.rawElement.aspectRatio ? cand.rawElement.aspectRatio : 1.0;
      const maxPossibleH = Math.max(cand.constraints.minHeight, remainingForHero);
      const idealW = Math.min(contentW, maxPossibleH * aspect);
      elW = Math.max(cand.constraints.minWidth, idealW);
      elH = Math.max(cand.constraints.minHeight, Math.min(maxPossibleH, elW / aspect));
      elX = bounds.x + padding + (contentW - elW) / 2; // Center horizontally
      reason = 'Hero allocated remaining vertical visual space';
    } else if (cand.role === 'action') {
      // CTA centered or matching content width
      elW = Math.min(contentW, Math.max(cand.currentWidth, cand.constraints.minWidth));
      elH = cand.currentHeight;
      elX = bounds.x + padding + (contentW - elW) / 2;
      reason = 'Action button placed at bottom anchor with hit-target padding';
    } else if (cand.role === 'branding') {
      // Logo at top center or left
      elW = Math.min(contentW * 0.6, cand.currentWidth);
      elH = cand.currentHeight;
      elX = bounds.x + padding + (contentW - elW) / 2;
      reason = 'Branding placed at top header anchor';
    } else {
      // Text elements
      elW = contentW;
      elH = cand.currentHeight;
      elX = bounds.x + padding;
      reason = 'Typography block spanned across vertical content lane';
    }

    // Overlap / overflow check
    if (currentY + elH > bounds.y + bounds.height + 1) {
      return { elements: [], fits: false };
    }

    elements.push(toResolvedElement(cand, { x: elX, y: currentY, width: elW, height: elH }, reason));
    currentY += elH + gap;
  }

  // Include dropped elements as visible=false
  for (const cand of candidates.filter(c => !c.isVisible)) {
    elements.push(toResolvedElement(cand, { x: 0, y: 0, width: 0, height: 0 }, 'Dropped during priority degradation'));
  }

  return { elements, fits: true };
}

/**
 * Attempts placement for a horizontal composition (wide ribbon / lower-third).
 */
function solveHorizontal(
  candidates: LayoutCandidate[],
  bounds: Rect,
  gap: number,
  padding: number
): { elements: ResolvedElement[]; fits: boolean } {
  const visible = candidates.filter(c => c.isVisible);
  const elements: ResolvedElement[] = [];

  const branding = visible.find(c => c.role === 'branding');
  const hero = visible.find(c => c.role === 'hero');
  const primary = visible.find(c => c.role === 'primary');
  const secondary = visible.find(c => c.role === 'secondary');
  const action = visible.find(c => c.role === 'action');

  const contentH = bounds.height - padding * 2;

  // Calculate widths for anchors:
  // Left: Branding / Hero thumbnail
  // Right: Action CTA button
  // Center: Typography (Headline + Secondary)

  let leftX = bounds.x + padding;
  let rightX = bounds.x + bounds.width - padding;

  // 1. Place Action CTA on the right anchor
  if (action) {
    const ctaW = Math.max(action.constraints.minWidth, action.currentWidth);
    const ctaH = Math.min(contentH, action.currentHeight);
    rightX -= ctaW;
    const ctaY = bounds.y + padding + (contentH - ctaH) / 2;

    elements.push(
      toResolvedElement(
        action,
        { x: rightX, y: ctaY, width: ctaW, height: ctaH },
        'Action button anchored on right boundary for rapid interaction'
      )
    );
    rightX -= gap; // Gap between center content and CTA
  }

  // 2. Place Branding on the far left anchor if visible
  if (branding) {
    const brandW = Math.min(180, branding.currentWidth);
    const brandH = Math.min(contentH * 0.7, branding.currentHeight);
    const brandY = bounds.y + padding + (contentH - brandH) / 2;

    elements.push(
      toResolvedElement(
        branding,
        { x: leftX, y: brandY, width: brandW, height: brandH },
        'Branding anchored to leading horizontal edge'
      )
    );
    leftX += brandW + gap;
  }

  // 3. Place Hero graphic (next to branding or on left)
  if (hero) {
    const aspect = hero.rawElement.type === 'image' && hero.rawElement.aspectRatio ? hero.rawElement.aspectRatio : 1.0;
    const heroH = Math.min(contentH, hero.constraints.maxHeight);
    const heroW = Math.round(heroH * aspect);

    // If hero fits comfortably within horizontal budget
    if (leftX + heroW < rightX - 100) {
      const heroY = bounds.y + padding + (contentH - heroH) / 2;
      elements.push(
        toResolvedElement(
          hero,
          { x: leftX, y: heroY, width: heroW, height: heroH },
          'Hero visual scaled to ribbon height maintaining aspect ratio'
        )
      );
      leftX += heroW + gap;
    } else {
      // Hero cannot fit horizontally alongside text and CTA
      return { elements: [], fits: false };
    }
  }

  // 4. Remaining middle corridor for Typography (Headline + Secondary)
  const middleW = rightX - leftX;
  if (middleW < 80 && (primary || secondary)) {
    return { elements: [], fits: false };
  }

  // If both primary and secondary are visible, stack them vertically or place inline
  if (primary && secondary) {
    const totalTextH = primary.currentHeight + secondary.currentHeight + 4;
    if (totalTextH <= contentH) {
      // Stack vertically in the center corridor
      const startY = bounds.y + padding + (contentH - totalTextH) / 2;

      elements.push(
        toResolvedElement(
          primary,
          { x: leftX, y: startY, width: middleW, height: primary.currentHeight },
          'Primary headline positioned in central horizontal corridor'
        )
      );

      elements.push(
        toResolvedElement(
          secondary,
          {
            x: leftX,
            y: startY + primary.currentHeight + 4,
            width: Math.min(middleW, secondary.currentWidth),
            height: secondary.currentHeight,
          },
          'Secondary copy stacked below headline'
        )
      );
    } else {
      // Inline arrangement in corridor
      const primW = Math.round(middleW * 0.65);
      const secW = middleW - primW - gap;
      const primY = bounds.y + padding + (contentH - primary.currentHeight) / 2;
      const secY = bounds.y + padding + (contentH - secondary.currentHeight) / 2;

      elements.push(
        toResolvedElement(
          primary,
          { x: leftX, y: primY, width: primW, height: primary.currentHeight },
          'Headline allocated majority of center corridor'
        )
      );

      elements.push(
        toResolvedElement(
          secondary,
          { x: leftX + primW + gap, y: secY, width: secW, height: secondary.currentHeight },
          'Secondary badge placed adjacent to headline'
        )
      );
    }
  } else if (primary) {
    const primY = bounds.y + padding + (contentH - primary.currentHeight) / 2;
    elements.push(
      toResolvedElement(
        primary,
        { x: leftX, y: primY, width: middleW, height: primary.currentHeight },
        'Headline fills central horizontal corridor'
      )
    );
  } else if (secondary) {
    const secY = bounds.y + padding + (contentH - secondary.currentHeight) / 2;
    elements.push(
      toResolvedElement(
        secondary,
        { x: leftX, y: secY, width: middleW, height: secondary.currentHeight },
        'Secondary element fills central corridor'
      )
    );
  }

  // Include dropped elements as visible=false
  for (const cand of candidates.filter(c => !c.isVisible)) {
    elements.push(toResolvedElement(cand, { x: 0, y: 0, width: 0, height: 0 }, 'Dropped during priority degradation'));
  }

  return { elements, fits: true };
}

/**
 * Attempts placement for a balanced composition (near-square / kiosk / quadrant).
 */
function solveBalanced(
  candidates: LayoutCandidate[],
  bounds: Rect,
  gap: number,
  padding: number
): { elements: ResolvedElement[]; fits: boolean } {
  const visible = candidates.filter(c => c.isVisible);
  const elements: ResolvedElement[] = [];

  const branding = visible.find(c => c.role === 'branding');
  const hero = visible.find(c => c.role === 'hero');
  const primary = visible.find(c => c.role === 'primary');
  const secondary = visible.find(c => c.role === 'secondary');
  const action = visible.find(c => c.role === 'action');

  const contentW = bounds.width - padding * 2;
  const contentH = bounds.height - padding * 2;

  // Decide between 2-column horizontal split vs upper/lower stage based on aspect ratio
  const isWider = bounds.width >= bounds.height * 1.15;

  if (isWider && hero) {
    // Stage 1: Left Column = Hero (48% width)
    // Stage 2: Right Column = Branding, Headline, Price, CTA
    const leftColW = Math.round((contentW - gap) * 0.48);
    const rightColW = contentW - gap - leftColW;

    const heroAspect = hero.rawElement.type === 'image' && hero.rawElement.aspectRatio ? hero.rawElement.aspectRatio : 1.0;
    const heroH = Math.min(contentH, leftColW / heroAspect);
    const heroW = Math.min(leftColW, heroH * heroAspect);
    const heroX = bounds.x + padding + (leftColW - heroW) / 2;
    const heroY = bounds.y + padding + (contentH - heroH) / 2;

    elements.push(
      toResolvedElement(
        hero,
        { x: heroX, y: heroY, width: heroW, height: heroH },
        'Hero occupies balanced left focal column'
      )
    );

    // Right column flow: Branding -> Headline -> Secondary -> CTA
    let currentY = bounds.y + padding;
    const rightX = bounds.x + padding + leftColW + gap;

    if (branding) {
      elements.push(
        toResolvedElement(
          branding,
          { x: rightX, y: currentY, width: Math.min(rightColW, branding.currentWidth), height: branding.currentHeight },
          'Branding at top of right information column'
        )
      );
      currentY += branding.currentHeight + gap;
    }

    if (primary) {
      elements.push(
        toResolvedElement(
          primary,
          { x: rightX, y: currentY, width: rightColW, height: primary.currentHeight },
          'Primary headline positioned in right information column'
        )
      );
      currentY += primary.currentHeight + gap;
    }

    if (secondary) {
      elements.push(
        toResolvedElement(
          secondary,
          {
            x: rightX,
            y: currentY,
            width: Math.min(rightColW, secondary.currentWidth),
            height: secondary.currentHeight,
          },
          'Secondary value badge in right column'
        )
      );
      currentY += secondary.currentHeight + gap;
    }

    if (action) {
      const ctaW = Math.min(rightColW, Math.max(action.constraints.minWidth, action.currentWidth));
      const ctaH = Math.max(action.constraints.minHeight, action.currentHeight);

      // Check if CTA fits within column height
      if (currentY + ctaH > bounds.y + bounds.height + 1) {
        return { elements: [], fits: false };
      }

      elements.push(
        toResolvedElement(
          action,
          { x: rightX, y: currentY, width: ctaW, height: ctaH },
          'Interactive CTA anchored in right action column'
        )
      );
    }
  } else {
    // Upper / Lower Stage (e.g. 1080x1080 kiosk or compact square):
    // Top Bar: Branding
    // Upper Stage: Hero Image (prominent 40-50% vertical space)
    // Lower Stage: Headline, Price, Action CTA
    let currentY = bounds.y + padding;

    if (branding) {
      const bW = Math.min(contentW * 0.5, branding.currentWidth);
      const bX = bounds.x + padding + (contentW - bW) / 2;
      elements.push(
        toResolvedElement(
          branding,
          { x: bX, y: currentY, width: bW, height: branding.currentHeight },
          'Header branding in balanced showcase'
        )
      );
      currentY += branding.currentHeight + gap;
    }

    // Remaining vertical space calculation
    const bottomNeededH =
      (primary ? primary.currentHeight + gap : 0) +
      (secondary ? secondary.currentHeight + gap : 0) +
      (action ? action.currentHeight + gap : 0);

    const availableForHero = bounds.y + bounds.height - padding - currentY - bottomNeededH;

    if (hero) {
      if (availableForHero < hero.constraints.minHeight) {
        return { elements: [], fits: false };
      }
      const aspect = hero.rawElement.type === 'image' && hero.rawElement.aspectRatio ? hero.rawElement.aspectRatio : 1.0;
      const heroH = Math.min(availableForHero, contentW / aspect);
      const heroW = Math.min(contentW, heroH * aspect);
      const heroX = bounds.x + padding + (contentW - heroW) / 2;

      elements.push(
        toResolvedElement(
          hero,
          { x: heroX, y: currentY, width: heroW, height: heroH },
          'Hero centered in upper stage of balanced display'
        )
      );
      currentY += heroH + gap;
    }

    if (primary) {
      elements.push(
        toResolvedElement(
          primary,
          { x: bounds.x + padding, y: currentY, width: contentW, height: primary.currentHeight },
          'Headline in lower typography cluster'
        )
      );
      currentY += primary.currentHeight + gap;
    }

    if (secondary) {
      elements.push(
        toResolvedElement(
          secondary,
          {
            x: bounds.x + padding + (contentW - secondary.currentWidth) / 2,
            y: currentY,
            width: Math.min(contentW, secondary.currentWidth),
            height: secondary.currentHeight,
          },
          'Secondary value element centered below headline'
        )
      );
      currentY += secondary.currentHeight + gap;
    }

    if (action) {
      const ctaW = Math.min(contentW, Math.max(action.constraints.minWidth, action.currentWidth));
      const ctaH = Math.max(action.constraints.minHeight, action.currentHeight);
      const ctaX = bounds.x + padding + (contentW - ctaW) / 2;

      if (currentY + ctaH > bounds.y + bounds.height + 1) {
        return { elements: [], fits: false };
      }

      elements.push(
        toResolvedElement(
          action,
          { x: ctaX, y: currentY, width: ctaW, height: ctaH },
          'Prominent CTA button anchored at base of kiosk stage'
        )
      );
    }
  }

  // Include dropped elements as visible=false
  for (const cand of candidates.filter(c => !c.isVisible)) {
    elements.push(toResolvedElement(cand, { x: 0, y: 0, width: 0, height: 0 }, 'Dropped during priority degradation'));
  }

  return { elements, fits: true };
}

/**
 * Validates a candidate layout against all hard geometry and physical constraints.
 */
export function validateLayoutConstraints(
  elements: ResolvedElement[],
  usableBounds: Rect,
  surface: SurfaceProfile
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const visible = elements.filter(e => e.visible);

  // 1. Check boundary containment
  for (const el of visible) {
    if (!isInsideBounds(el, usableBounds, 1.0)) {
      errors.push(
        `Element "${el.id}" exceeds usable boundary: rect=[${el.x}, ${el.y}, ${el.width}, ${el.height}] inside bounds=[${usableBounds.x}, ${usableBounds.y}, ${usableBounds.width}, ${usableBounds.height}]`
      );
    }
  }

  // 2. Check collision/overlaps among visible elements
  const overlaps = findOverlaps(visible);
  if (overlaps.length > 0) {
    for (const [i, j] of overlaps) {
      errors.push(`Overlap detected between "${visible[i].id}" and "${visible[j].id}"`);
    }
  }

  // 3. Check minimum tap target for touch-enabled surfaces
  const minTap = surface.touchOnly || surface.minTapTarget ? (surface.minTapTarget ?? 44) : 0;
  if (minTap > 0) {
    for (const el of visible) {
      if (el.role === 'action' || el.type === 'button') {
        if (el.width < minTap - 0.5 || el.height < minTap - 0.5) {
          errors.push(
            `Action button "${el.id}" dimensions (${el.width}x${el.height}) violate minTapTarget (${minTap}px)`
          );
        }
      }
    }
  }

  // 4. Check minimum text size
  if (surface.minTextSize !== undefined && surface.minTextSize > 0) {
    for (const el of visible) {
      if (el.type === 'text' && el.fontSize !== undefined) {
        if (el.fontSize < surface.minTextSize) {
          errors.push(
            `Text element "${el.id}" font size (${el.fontSize}px) is below surface minTextSize (${surface.minTextSize}px)`
          );
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Main Layout Resolver Entry Point.
 * Resolves an AdSpec onto any SurfaceProfile deterministically.
 */
export function resolveLayout(adSpec: AdSpec, surface: SurfaceProfile): ResolvedLayout {
  const startTime = performance.now();

  // STEP 1: Validate input
  const specValidation = validateAdSpec(adSpec);
  if (!specValidation.valid) {
    throw new Error(`Invalid AdSpec: ${specValidation.errors.join('; ')}`);
  }

  const surfaceValidation = validateSurfaceProfile(surface);
  if (!surfaceValidation.valid) {
    throw new Error(`Invalid SurfaceProfile: ${surfaceValidation.errors.join('; ')}`);
  }

  // STEP 2: Calculate usable area subtracting safe areas
  const { usable, safeArea } = calculateUsableBounds(surface);

  // STEP 3: Analyze surface geometry
  const aspectRatio = getAspectRatio(usable.width, usable.height);
  const composition = classifyComposition(aspectRatio);

  // STEP 4: Normalize elements into candidates
  const initialCandidates = adSpec.elements.map(el =>
    createLayoutCandidate(el, surface, usable.width, usable.height)
  );

  // Density spacing parameters
  const densityMetrics = getDensityMetrics(surface.density);

  let bestResolvedElements: ResolvedElement[] = [];
  let bestDecisions: any[] = [];
  let isLayoutValid = false;
  let validationErrors: string[] = [];

  // STEP 5 & 6: Iterative priority-based degradation loop
  for (let level = 0; level <= MAX_DEGRADATION_LEVEL; level++) {
    const { candidates, decisions } = applyDegradationLevel(initialCandidates, level, surface);

    // Apply spacing reduction at level 1+
    const gap = level >= 1 ? Math.max(4, Math.round(densityMetrics.gap * 0.6)) : densityMetrics.gap;
    const padding = level >= 1 ? Math.max(6, Math.round(densityMetrics.padding * 0.6)) : densityMetrics.padding;

    let solution: { elements: ResolvedElement[]; fits: boolean };

    switch (composition) {
      case 'vertical':
        solution = solveVertical(candidates, usable, gap, padding);
        break;
      case 'horizontal':
        solution = solveHorizontal(candidates, usable, gap, padding);
        break;
      case 'balanced':
      default:
        solution = solveBalanced(candidates, usable, gap, padding);
        break;
    }

    if (solution.fits && solution.elements.length > 0) {
      const check = validateLayoutConstraints(solution.elements, usable, surface);
      if (check.isValid) {
        bestResolvedElements = solution.elements;
        bestDecisions = decisions;
        isLayoutValid = true;
        validationErrors = [];
        break; // Optimal layout resolved!
      } else {
        validationErrors = check.errors;
        bestResolvedElements = solution.elements;
        bestDecisions = decisions;
      }
    } else {
      validationErrors = [`Layout candidate set does not fit inside usable bounds at level ${level}`];
    }
  }

  const endTime = performance.now();
  const visibleCount = bestResolvedElements.filter(e => e.visible).length;
  const droppedCount = bestResolvedElements.length - visibleCount;

  const diagnostics: LayoutDiagnostics = {
    aspectRatio: Number(aspectRatio.toFixed(3)),
    usableBounds: usable,
    totalElements: adSpec.elements.length,
    visibleElements: visibleCount,
    droppedElements: droppedCount,
    composition,
    degradationSteps: bestDecisions,
    isValid: isLayoutValid,
    validationErrors,
    resolutionTimeMs: Number((endTime - startTime).toFixed(2)),
  };

  return {
    surfaceId: surface.id,
    surfaceName: surface.name,
    width: surface.width,
    height: surface.height,
    safeArea,
    elements: bestResolvedElements,
    orientation: composition,
    diagnostics,
  };
}
