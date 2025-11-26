/**
 * Style helper utilities
 */

import type { j } from '../main';

/**
 * Helper function to merge style objects safely.
 * TypeScript has issues with spread operators on objects with index signatures that include undefined.
 * This function provides proper type inference for merging style objects.
 */
export function mergeStyles(...styles: j.Style[]): j.Style {
    return Object.assign({}, ...styles) as j.Style;
}
