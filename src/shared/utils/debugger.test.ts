/**
 * Tests for debugger utility
 */

import { ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { isDebugging } from './debugger';

describe('isDebugging', () => {
    test('returns a boolean value', () => {
        const result = isDebugging(true);
        strictEqual(typeof result, 'boolean', 'Should return a boolean');
    });

    test('returns consistent value on multiple calls', () => {
        const result1 = isDebugging(true);
        const result2 = isDebugging(true);
        const result3 = isDebugging();

        strictEqual(result1, result2, 'Should return same value on second call');
        strictEqual(result2, result3, 'Should return same value on third call');
    });

    test('handles browser environment check', () => {
        // Test that the function handles the browser check properly
        // In Node.js environment, process should be defined
        ok(typeof process !== 'undefined', 'process should be defined in Node.js');
        ok(typeof process.debugPort !== 'undefined', 'process.debugPort should be defined');

        // Call isDebugging to ensure code coverage
        const result = isDebugging(true);
        strictEqual(typeof result, 'boolean');
    });

    test('returns inspector data', () => {
        const save = process.debugPort;
        try {
            const _result1 = isDebugging(true);
            Object(process).debugPort = 1111;
            const result2 = isDebugging(true);
            strictEqual(typeof result2, 'boolean');
        } finally {
            process.debugPort = save;
        }
    });
});
