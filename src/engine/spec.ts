/**
 * Ad Specification helper and builder
 */

import { AdSpec } from './types';
import { validateAdSpec } from './validation';

/**
 * Type-safe ad spec definition with upfront validation
 */
export function defineAd(spec: AdSpec): AdSpec {
  const result = validateAdSpec(spec);
  if (!result.valid) {
    throw new Error(`Invalid AdSpec: ${result.errors.join('; ')}`);
  }
  return spec;
}
