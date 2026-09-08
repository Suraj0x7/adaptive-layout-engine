/**
 * Geometric primitives, bounding-box checks, and collision detection.
 */

import { Rect, SurfaceProfile, SafeArea } from './types';

/**
 * Checks if two rectangles overlap with strict positive interior intersection.
 * Edge-touching (sharing a border) is NOT considered an overlap.
 * Uses a small epsilon for floating-point stability.
 */
export function intersects(rectA: Rect, rectB: Rect, epsilon = 0.001): boolean {
  return (
    rectA.x < rectB.x + rectB.width - epsilon &&
    rectA.x + rectA.width > rectB.x + epsilon &&
    rectA.y < rectB.y + rectB.height - epsilon &&
    rectA.y + rectA.height > rectB.y + epsilon
  );
}

/**
 * Checks if a rectangle is fully contained within another bounding rectangle.
 */
export function isInsideBounds(rect: Rect, bounds: Rect, epsilon = 0.01): boolean {
  return (
    rect.x >= bounds.x - epsilon &&
    rect.y >= bounds.y - epsilon &&
    rect.x + rect.width <= bounds.x + bounds.width + epsilon &&
    rect.y + rect.height <= bounds.y + bounds.height + epsilon
  );
}

/**
 * Clamps a rectangle within boundary dimensions.
 */
export function clampRect(rect: Rect, bounds: Rect): Rect {
  const x = Math.max(bounds.x, Math.min(rect.x, bounds.x + bounds.width - rect.width));
  const y = Math.max(bounds.y, Math.min(rect.y, bounds.y + bounds.height - rect.height));
  const width = Math.min(rect.width, bounds.width);
  const height = Math.min(rect.height, bounds.height);
  return { x, y, width, height };
}

/**
 * Calculates usable bounding box taking safe areas into account.
 */
export function calculateUsableBounds(surface: SurfaceProfile): { usable: Rect; safeArea: SafeArea } {
  const safeArea: SafeArea = surface.safeArea || { top: 0, right: 0, bottom: 0, left: 0 };
  const usable: Rect = {
    x: safeArea.left,
    y: safeArea.top,
    width: Math.max(0, surface.width - safeArea.left - safeArea.right),
    height: Math.max(0, surface.height - safeArea.top - safeArea.bottom),
  };
  return { usable, safeArea };
}

/**
 * Identifies any pairwise collisions among an array of rectangles.
 * Returns pairs of overlapping indices.
 */
export function findOverlaps(rects: Rect[]): [number, number][] {
  const collisions: [number, number][] = [];
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      if (intersects(rects[i], rects[j])) {
        collisions.push([i, j]);
      }
    }
  }
  return collisions;
}

/**
 * Computes the aspect ratio (width / height).
 */
export function getAspectRatio(width: number, height: number): number {
  if (height <= 0) return 1;
  return width / height;
}
