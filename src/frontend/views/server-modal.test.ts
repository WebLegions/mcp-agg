/**
 * Tests for server-modal schema validation
 */

import * as assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { mcpHTTPServerSchema, mcpSSEServerSchema, mcpStdioServerSchema } from '../../shared/types/mcp-config';

/**
 * Helper function to validate a field using the appropriate schema
 */
function validateField(field: string, value: unknown, transport: string): string | undefined {
    let schema: typeof mcpStdioServerSchema | typeof mcpSSEServerSchema | typeof mcpHTTPServerSchema;
    switch (transport) {
        case 'stdio':
            schema = mcpStdioServerSchema;
            break;
        case 'sse':
            schema = mcpSSEServerSchema;
            break;
        case 'http':
            schema = mcpHTTPServerSchema;
            break;
        default:
            return 'command: invalid field';
    }

    // Extract field validator from schema
    // @ts-expect-error - accessing internal _schema field
    const fieldValidator = schema._schema?.[field];
    if (!fieldValidator) {
        return `${field}: invalid field`;
    }

    const result = fieldValidator.safeParse(value);
    return result.success ? undefined : `${field}: ${result.error?.message || 'validation error'}`;
}

describe('validateField', () => {
    test('validates stdio transport - valid command', () => {
        const error = validateField('command', 'node server.js', 'stdio');
        assert.equal(error, undefined);
    });

    test('validates stdio transport - empty command returns error', () => {
        const error = validateField('command', '', 'stdio');
        assert.ok(error !== undefined, `Expected error but got: ${error}`);
        assert.ok(error.length > 0);
    });

    test('validates stdio transport - valid args array', () => {
        const error = validateField('args', ['--port', '3000'], 'stdio');
        assert.equal(error, undefined);
    });

    test('validates stdio transport - optional args can be undefined', () => {
        const error = validateField('args', undefined, 'stdio');
        assert.equal(error, undefined);
    });

    test('validates sse transport - valid url', () => {
        const error = validateField('url', 'https://example.com/sse', 'sse');
        assert.equal(error, undefined);
    });

    test('validates sse transport - invalid url returns error', () => {
        const error = validateField('url', 'not-a-url', 'sse');
        assert.ok(error !== undefined, `Expected error but got: ${error}`);
        assert.ok(error.length > 0);
    });

    test('validates http transport - valid url', () => {
        const error = validateField('url', 'https://api.example.com', 'http');
        assert.equal(error, undefined);
    });

    test('validates name field - valid name', () => {
        const error = validateField('name', 'my-server', 'stdio');
        assert.equal(error, undefined);
    });

    test('validates name field - empty name returns error', () => {
        const error = validateField('name', '', 'stdio');
        assert.ok(error !== undefined, `Expected error but got: ${error}`);
        assert.ok(error.length > 0);
    });

    test('validates name field - name too long returns error', () => {
        const error = validateField('name', 'a'.repeat(121), 'stdio');
        assert.ok(error !== undefined, `Expected error but got: ${error}`);
        assert.ok(error.length > 0);
    });

    test('validates description field - valid description', () => {
        const error = validateField('description', 'A test server', 'stdio');
        assert.equal(error, undefined);
    });

    test('validates description field - optional can be undefined', () => {
        const error = validateField('description', undefined, 'stdio');
        assert.equal(error, undefined);
    });

    test('validates enabled field - valid boolean', () => {
        const error = validateField('enabled', true, 'stdio');
        assert.equal(error, undefined);
    });

    test('validates enabled field - optional can be undefined', () => {
        const error = validateField('enabled', undefined, 'stdio');
        assert.equal(error, undefined);
    });

    test('returns error for non-existent field', () => {
        const error = validateField('nonexistent', 'value', 'stdio');
        assert.equal(error, 'nonexistent: invalid field');
    });

    test('returns error for invalid transport', () => {
        const error = validateField('command', 'value', 'invalid-transport');
        assert.equal(error, 'command: invalid field');
    });

    test('validates command field does not exist on sse transport', () => {
        const error = validateField('command', 'node server.js', 'sse');
        assert.equal(error, 'command: invalid field'); // Field doesn't exist on this transport
    });

    test('validates url field does not exist on stdio transport', () => {
        const error = validateField('url', 'https://example.com', 'stdio');
        assert.equal(error, 'url: invalid field'); // Field doesn't exist on this transport
    });

    test('validates env field - valid record', () => {
        const error = validateField('env', { NODE_ENV: 'production' }, 'stdio');
        assert.equal(error, undefined);
    });

    test('validates env field - optional can be undefined', () => {
        const error = validateField('env', undefined, 'stdio');
        assert.equal(error, undefined);
    });
});
