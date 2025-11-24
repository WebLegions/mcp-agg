/**
 * Style helper utilities
 */

import type { StyleObject } from '../types/juris';

/**
 * Helper function to merge style objects safely.
 * TypeScript has issues with spread operators on objects with index signatures that include undefined.
 * This function provides proper type inference for merging style objects.
 */
export function mergeStyles(...styles: StyleObject['string'][]): StyleObject {
    return Object.assign({}, ...styles) as StyleObject;
}
