/**
 * Validation utilities for Ad Specifications and Surface Profiles.
 * Validates constraints, boundary limits, and schema integrity.
 */

import { AdSpec, SurfaceProfile } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateAdSpec(adSpec: AdSpec): ValidationResult {
  const errors: string[] = [];

  if (!adSpec.id || typeof adSpec.id !== 'string') {
    errors.push('AdSpec must have a non-empty string ID');
  }

  if (!Array.isArray(adSpec.elements) || adSpec.elements.length === 0) {
    errors.push('AdSpec must have at least one element');
    return { valid: false, errors };
  }

  const ids = new Set<string>();
  const validRoles = new Set(['primary', 'secondary', 'hero', 'action', 'branding']);
  const validTypes = new Set(['text', 'image', 'button']);
  const validPriorities = new Set([1, 2, 3]);

  for (const el of adSpec.elements) {
    // Check ID uniqueness
    if (!el.id || typeof el.id !== 'string') {
      errors.push(`Element has missing or invalid id: ${JSON.stringify(el)}`);
    } else if (ids.has(el.id)) {
      errors.push(`Duplicate element ID detected: "${el.id}"`);
    } else {
      ids.add(el.id);
    }

    // Check Role
    if (!validRoles.has(el.role)) {
      errors.push(`Element "${el.id}" has invalid role "${el.role}"`);
    }

    // Check Type
    if (!validTypes.has(el.type)) {
      errors.push(`Element "${el.id}" has invalid type "${el.type}"`);
    }

    // Check Priority
    if (!validPriorities.has(el.priority)) {
      errors.push(`Element "${el.id}" has invalid priority "${el.priority}". Must be 1, 2, or 3.`);
    }

    // Type-specific field checks
    if (el.type === 'text') {
      if (typeof el.content !== 'string' || el.content.trim().length === 0) {
        errors.push(`Text element "${el.id}" must have non-empty content`);
      }
    } else if (el.type === 'image') {
      if (!el.src || typeof el.src !== 'string') {
        errors.push(`Image element "${el.id}" must have a valid src string`);
      }
      if (el.aspectRatio !== undefined && (el.aspectRatio <= 0 || !Number.isFinite(el.aspectRatio))) {
        errors.push(`Image element "${el.id}" has invalid aspectRatio "${el.aspectRatio}"`);
      }
    } else if (el.type === 'button') {
      if (typeof el.content !== 'string' || el.content.trim().length === 0) {
        errors.push(`Button element "${el.id}" must have non-empty content label`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateSurfaceProfile(surface: SurfaceProfile): ValidationResult {
  const errors: string[] = [];

  if (!surface.id || typeof surface.id !== 'string') {
    errors.push('SurfaceProfile must have a valid string ID');
  }

  if (typeof surface.width !== 'number' || surface.width <= 0 || !Number.isFinite(surface.width)) {
    errors.push(`Surface width must be a positive finite number, received: ${surface.width}`);
  }

  if (typeof surface.height !== 'number' || surface.height <= 0 || !Number.isFinite(surface.height)) {
    errors.push(`Surface height must be a positive finite number, received: ${surface.height}`);
  }

  const safe = surface.safeArea || { top: 0, right: 0, bottom: 0, left: 0 };
  if (safe.left < 0 || safe.right < 0 || safe.top < 0 || safe.bottom < 0) {
    errors.push('SafeArea insets must not be negative');
  }

  if (safe.left + safe.right >= surface.width) {
    errors.push(
      `Impossible safe area horizontal insets (${safe.left} + ${safe.right} = ${safe.left + safe.right}) >= surface width (${surface.width})`
    );
  }

  if (safe.top + safe.bottom >= surface.height) {
    errors.push(
      `Impossible safe area vertical insets (${safe.top} + ${safe.bottom} = ${safe.top + safe.bottom}) >= surface height (${surface.height})`
    );
  }

  if (surface.minTextSize !== undefined && (surface.minTextSize <= 0 || !Number.isFinite(surface.minTextSize))) {
    errors.push(`Invalid minTextSize: ${surface.minTextSize}`);
  }

  if (surface.minTapTarget !== undefined && (surface.minTapTarget < 0 || !Number.isFinite(surface.minTapTarget))) {
    errors.push(`Invalid minTapTarget: ${surface.minTapTarget}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
