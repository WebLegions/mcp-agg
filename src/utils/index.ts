/**
 * @module util
 *
 * This module provides utility functions and classes for the application.
 */

import { constants } from 'node:os';

// Re-export commonly used utilities from shared
export { Env } from '../shared/utils/env';
export { ErrorEx } from '../shared/utils/error';
export * from './at-exit';
export * from './immutable';
export * from './logger';
export * from './safe';
export * from './shell';

/**
 * errno utility: provides map from errno codes to names (Node.js only).
 * this replaces the buggy util.getSystemErrorName and util.getSystemErrorMessage
 * Example: getErrorName(errno.ENOENT) === "ENOENT"
 */
export const errno = constants.errno;
export const getErrorName = (e: number) => Object.keys(errno).find((key) => Object(errno)[key] === e) || e.toString();
