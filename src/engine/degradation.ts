/**
 * Deterministic Priority-Based Degradation Engine.
 * Progressively relieves geometric pressure while protecting critical priority-1 elements.
 */

import { DegradationDecision, SurfaceProfile } from './types';
import { LayoutCandidate, estimateTextDimensions } from './constraints';

export const MAX_DEGRADATION_LEVEL = 7;

export interface DegradationResult {
  candidates: LayoutCandidate[];
  decisions: DegradationDecision[];
  currentLevel: number;
}

/**
 * Applies a specific degradation level to the candidate set.
 * Returns modified candidate clones and records diagnostic decisions.
 */
export function applyDegradationLevel(
  candidates: LayoutCandidate[],
  targetLevel: number,
  surface: SurfaceProfile
): { candidates: LayoutCandidate[]; decisions: DegradationDecision[] } {
  const decisions: DegradationDecision[] = [];
  const surfaceMinText = surface.minTextSize ?? 10;

  // Deep clone candidates for deterministic modification
  const updated: LayoutCandidate[] = candidates.map(c => ({
    ...c,
    constraints: { ...c.constraints },
  }));

  // Enforce surface maxElements constraint if defined
  if (surface.maxElements && targetLevel >= 1) {
    const visibleCount = updated.filter(c => c.isVisible).length;
    if (visibleCount > surface.maxElements) {
      // Find lowest priority visible candidate that is droppable or priority 3
      const droppable = updated
        .filter(c => c.isVisible && (c.priority >= 3 || c.constraints.canDrop))
        .sort((a, b) => b.priority - a.priority);

      for (const cand of droppable) {
        if (updated.filter(c => c.isVisible).length <= surface.maxElements) break;
        cand.isVisible = false;
        cand.degradationLevel = Math.max(cand.degradationLevel, targetLevel);
        decisions.push({
          elementId: cand.id,
          action: 'removed',
          reason: `Surface maxElements (${surface.maxElements}) constraint exceeded`,
          priority: cand.priority,
          level: targetLevel,
          detail: `Dropped element "${cand.id}" to satisfy maxElements budget`,
        });
      }
    }
  }

  for (let lvl = 1; lvl <= targetLevel; lvl++) {
    switch (lvl) {
      case 1: {
        // Level 1: Padding & Spacing reduction is handled in the layout allocator
        decisions.push({
          elementId: 'global-spacing',
          action: 'spacing_reduced',
          reason: 'Tight surface area; compressed inter-element gaps and padding',
          priority: 3,
          level: 1,
          detail: 'Reduced layout padding and gaps by 40%',
        });
        break;
      }

      case 2: {
        // Level 2: Shrink lower-priority branding elements (priority >= 3)
        for (const cand of updated) {
          if (cand.isVisible && cand.role === 'branding') {
            const shrunkW = Math.max(cand.constraints.minWidth, Math.round(cand.constraints.prefWidth * 0.7));
            const shrunkH = Math.max(cand.constraints.minHeight, Math.round(cand.constraints.prefHeight * 0.7));
            if (shrunkW < cand.currentWidth) {
              cand.currentWidth = shrunkW;
              cand.currentHeight = shrunkH;
              cand.degradationLevel = Math.max(cand.degradationLevel, 2);
              decisions.push({
                elementId: cand.id,
                action: 'shrunk',
                reason: 'Insufficient space for full branding footprint',
                priority: cand.priority,
                level: 2,
                detail: `Shrunk branding logo to ${shrunkW}x${shrunkH}`,
              });
            }
          }
        }
        break;
      }

      case 3: {
        // Level 3: Reduce secondary text font size, bounded by surface.minTextSize
        for (const cand of updated) {
          if (cand.isVisible && cand.role === 'secondary' && cand.type === 'text') {
            const currentFont = cand.currentFontSize ?? 16;
            const targetFont = Math.max(surfaceMinText, Math.round(currentFont * 0.82));
            if (targetFont < currentFont) {
              cand.currentFontSize = targetFont;
              const textContent = (cand.rawElement as { content: string }).content;
              const est = estimateTextDimensions(textContent, targetFont, cand.currentWidth);
              cand.currentHeight = Math.max(cand.constraints.minHeight, est.height);
              cand.degradationLevel = Math.max(cand.degradationLevel, 3);
              decisions.push({
                elementId: cand.id,
                action: 'font_reduced',
                reason: 'Compressed secondary text font size to fit vertical budget',
                priority: cand.priority,
                level: 3,
                detail: `Font size reduced from ${currentFont}px to ${targetFont}px (floor: ${surfaceMinText}px)`,
              });
            }
          }
        }
        break;
      }

      case 4: {
        // Level 4: Truncate secondary text
        for (const cand of updated) {
          if (cand.isVisible && cand.role === 'secondary' && cand.type === 'text' && !cand.isTruncated) {
            cand.isTruncated = true;
            cand.currentHeight = Math.max(cand.constraints.minHeight, Math.round((cand.currentFontSize ?? 12) * 1.3));
            cand.degradationLevel = Math.max(cand.degradationLevel, 4);
            decisions.push({
              elementId: cand.id,
              action: 'truncated',
              reason: 'Truncating secondary text to single-line with ellipsis',
              priority: cand.priority,
              level: 4,
              detail: 'Enforced single line truncation for secondary text',
            });
          }
        }
        break;
      }

      case 5: {
        // Level 5: Drop lowest priority droppable elements (priority 3, e.g. branding)
        for (const cand of updated) {
          if (cand.isVisible && (cand.priority >= 3 || cand.role === 'branding')) {
            cand.isVisible = false;
            cand.degradationLevel = Math.max(cand.degradationLevel, 5);
            decisions.push({
              elementId: cand.id,
              action: 'removed',
              reason: 'Insufficient space; dropping lowest priority branding elements',
              priority: cand.priority,
              level: 5,
              detail: `Removed "${cand.id}" (priority ${cand.priority}) to salvage primary content`,
            });
          }
        }
        break;
      }

      case 6: {
        // Level 6: Shrink hero image toward minimum dimension
        for (const cand of updated) {
          if (cand.isVisible && cand.role === 'hero') {
            const shrunkW = Math.max(cand.constraints.minWidth, Math.round(cand.currentWidth * 0.65));
            const shrunkH = Math.max(cand.constraints.minHeight, Math.round(cand.currentHeight * 0.65));
            if (shrunkW < cand.currentWidth) {
              cand.currentWidth = shrunkW;
              cand.currentHeight = shrunkH;
              cand.degradationLevel = Math.max(cand.degradationLevel, 6);
              decisions.push({
                elementId: cand.id,
                action: 'shrunk',
                reason: 'Compressing hero graphic toward minimum bounds',
                priority: cand.priority,
                level: 6,
                detail: `Hero image scaled down to ${shrunkW}x${shrunkH}`,
              });
            }
          }
        }
        break;
      }

      case 7: {
        // Level 7: Drop priority 2 secondary elements if extreme space constraint persists
        for (const cand of updated) {
          if (cand.isVisible && cand.priority === 2 && cand.role !== 'action') {
            cand.isVisible = false;
            cand.degradationLevel = Math.max(cand.degradationLevel, 7);
            decisions.push({
              elementId: cand.id,
              action: 'removed',
              reason: 'Emergency degradation: dropping secondary copy to preserve CTA & headline',
              priority: cand.priority,
              level: 7,
              detail: `Removed priority 2 element "${cand.id}"`,
            });
          }
        }
        break;
      }
    }
  }

  return { candidates: updated, decisions };
}
