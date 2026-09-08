import { describe, it, expect } from 'vitest';
import { resolveLayout, validateLayoutConstraints } from '../src/engine/resolver';
import { SURFACE_PROFILES } from '../src/engine/surfaces';
import { DEMO_AD } from '../src/data/demoAd';
import { SurfaceProfile, AdSpec } from '../src/engine/types';
import { findOverlaps, isInsideBounds } from '../src/engine/geometry';

describe('Adaptive Layout Engine Resolver Tests', () => {
  // TEST 1: Mobile portrait resolves without overlap
  it('TEST 1: Mobile portrait resolves without overlap', () => {
    const layout = resolveLayout(DEMO_AD, SURFACE_PROFILES.mobilePortrait);
    expect(layout.diagnostics.isValid).toBe(true);
    expect(layout.diagnostics.validationErrors).toEqual([]);

    const visible = layout.elements.filter(e => e.visible);
    const overlaps = findOverlaps(visible);
    expect(overlaps).toHaveLength(0);
    expect(layout.orientation).toBe('vertical');
  });

  // TEST 2: Mobile landscape resolves without overlap
  it('TEST 2: Mobile landscape resolves without overlap', () => {
    const layout = resolveLayout(DEMO_AD, SURFACE_PROFILES.mobileLandscape);
    expect(layout.diagnostics.isValid).toBe(true);

    const visible = layout.elements.filter(e => e.visible);
    const overlaps = findOverlaps(visible);
    expect(overlaps).toHaveLength(0);
  });

  // TEST 3: Broadcast lower-third respects minimum text size
  it('TEST 3: Broadcast lower-third respects minimum text size', () => {
    const broadcastSurface = SURFACE_PROFILES.broadcastLowerThird;
    const layout = resolveLayout(DEMO_AD, broadcastSurface);

    expect(layout.orientation).toBe('horizontal');
    expect(layout.diagnostics.isValid).toBe(true);

    const textElements = layout.elements.filter(e => e.visible && e.type === 'text');
    expect(textElements.length).toBeGreaterThan(0);

    for (const textEl of textElements) {
      expect(textEl.fontSize).toBeDefined();
      expect(textEl.fontSize!).toBeGreaterThanOrEqual(broadcastSurface.minTextSize!);
    }
  });

  // TEST 4: Kiosk CTA respects minTapTarget
  it('TEST 4: Kiosk CTA respects minTapTarget', () => {
    const kioskSurface = SURFACE_PROFILES.retailKiosk;
    const layout = resolveLayout(DEMO_AD, kioskSurface);

    expect(layout.diagnostics.isValid).toBe(true);
    const cta = layout.elements.find(e => e.visible && (e.role === 'action' || e.type === 'button'));

    expect(cta).toBeDefined();
    expect(cta!.width).toBeGreaterThanOrEqual(kioskSurface.minTapTarget!);
    expect(cta!.height).toBeGreaterThanOrEqual(kioskSurface.minTapTarget!);
  });

  // TEST 5: Every visible element remains within surface bounds
  it('TEST 5: Every visible element remains within surface bounds', () => {
    for (const [key, surface] of Object.entries(SURFACE_PROFILES)) {
      const layout = resolveLayout(DEMO_AD, surface);
      const visible = layout.elements.filter(e => e.visible);

      for (const el of visible) {
        const inBounds = isInsideBounds(el, layout.diagnostics.usableBounds, 1.0);
        expect(
          inBounds,
          `Element ${el.id} on surface ${key} should be inside bounds [${layout.diagnostics.usableBounds.x}, ${layout.diagnostics.usableBounds.y}, ${layout.diagnostics.usableBounds.width}, ${layout.diagnostics.usableBounds.height}] but was [${el.x}, ${el.y}, ${el.width}, ${el.height}]`
        ).toBe(true);
      }
    }
  });

  // TEST 6: Constrained surface removes lower-priority content before priority-1 content
  it('TEST 6: Constrained surface removes lower-priority content before priority-1 content', () => {
    const constrainedSurface = SURFACE_PROFILES.constrainedSmall;
    const layout = resolveLayout(DEMO_AD, constrainedSurface);

    expect(layout.diagnostics.isValid).toBe(true);

    // Check that priority 1 elements (headline, hero) survive
    const headline = layout.elements.find(e => e.id === 'headline');
    const hero = layout.elements.find(e => e.id === 'product-image');
    const cta = layout.elements.find(e => e.id === 'cta');
    const logo = layout.elements.find(e => e.id === 'logo'); // Priority 3

    expect(headline?.visible).toBe(true);
    expect(hero?.visible).toBe(true);
    expect(cta?.visible).toBe(true);

    // Priority 3 logo should be dropped first
    expect(logo?.visible).toBe(false);
    expect(layout.diagnostics.droppedElements).toBeGreaterThanOrEqual(1);

    // Diagnostics should record removal
    const droppedDecision = layout.diagnostics.degradationSteps.find(
      d => d.elementId === 'logo' && d.action === 'removed'
    );
    expect(droppedDecision).toBeDefined();
    expect(droppedDecision!.priority).toBe(3);
  });

  // TEST 7: No two visible rectangles overlap across all surfaces
  it('TEST 7: No two visible rectangles overlap across all surfaces', () => {
    for (const surface of Object.values(SURFACE_PROFILES)) {
      const layout = resolveLayout(DEMO_AD, surface);
      const visible = layout.elements.filter(e => e.visible);
      const overlaps = findOverlaps(visible);
      expect(overlaps, `No overlaps on surface ${surface.id}`).toEqual([]);
    }
  });

  // TEST 8: Adding a completely new surface works without modifying resolver logic
  it('TEST 8: Adding a completely new surface works without modifying resolver logic', () => {
    const interviewSurface: SurfaceProfile = {
      id: 'interviewSurface',
      name: 'Interview Surface',
      width: 730,
      height: 410,
      safeArea: {
        top: 20,
        right: 30,
        bottom: 20,
        left: 30,
      },
      minTextSize: 18,
      minTapTarget: 48,
      touchOnly: true,
      viewingDistance: 'medium',
    };

    const layout = resolveLayout(DEMO_AD, interviewSurface);
    expect(layout).toBeDefined();
    expect(layout.surfaceId).toBe('interviewSurface');
    expect(layout.width).toBe(730);
    expect(layout.height).toBe(410);
    expect(layout.diagnostics.isValid).toBe(true);

    // Check bounds and collisions
    const check = validateLayoutConstraints(layout.elements, layout.diagnostics.usableBounds, interviewSurface);
    expect(check.isValid).toBe(true);
    expect(check.errors).toEqual([]);

    // Check minimum text size
    for (const el of layout.elements.filter(e => e.visible && e.type === 'text')) {
      expect(el.fontSize).toBeGreaterThanOrEqual(interviewSurface.minTextSize!);
    }
  });

  // Additional robustness tests
  it('Throws clear errors on invalid inputs (duplicate IDs, invalid dimensions, etc.)', () => {
    const invalidAd: AdSpec = {
      id: 'bad-ad',
      elements: [
        { id: 'item-1', type: 'text', role: 'primary', priority: 1, content: 'A' },
        { id: 'item-1', type: 'text', role: 'secondary', priority: 2, content: 'Duplicate!' },
      ],
    };

    expect(() => resolveLayout(invalidAd, SURFACE_PROFILES.mobilePortrait)).toThrowError(
      /Duplicate element ID/
    );

    const invalidSurface: SurfaceProfile = {
      id: 'bad-surface',
      name: 'Bad Surface',
      width: -100,
      height: 200,
    };

    expect(() => resolveLayout(DEMO_AD, invalidSurface)).toThrowError(
      /Surface width must be a positive/
    );
  });
});
