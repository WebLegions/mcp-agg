/**
 * Tests for InternalClient - builtin MCP tools
 */

import { strict as assert } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { InternalClient } from './internal-client';

describe('InternalClient', () => {
    test('starts disconnected', () => {
        const client = new InternalClient();
        assert.equal(client.connected, false);
    });

    test('connects successfully', async () => {
        const client = new InternalClient();
        await client.connect();
        assert.equal(client.connected, true);
        await client.close();
    });

    test('disconnects successfully', async () => {
        const client = new InternalClient();
        await client.connect();
        await client.close();
        assert.equal(client.connected, false);
    });

    test('connect is idempotent', async () => {
        const client = new InternalClient();
        await client.connect();
        await client.connect(); // Should not throw
        assert.equal(client.connected, true);
        await client.close();
    });

    test('close is idempotent', async () => {
        const client = new InternalClient();
        await client.connect();
        await client.close();
        await client.close(); // Should not throw
        assert.equal(client.connected, false);
    });

    test('has refCount property', () => {
        const client = new InternalClient();
        assert.equal(client.refCount, 0);
    });

    test('lists exactly 2 builtin tools', async () => {
        const client = new InternalClient();
        await client.connect();

        const tools = await client.listTools();
        assert.equal(tools.length, 2);

        await client.close();
    });

    test('provides health and format_number tools', async () => {
        const client = new InternalClient();
        await client.connect();

        const tools = await client.listTools();
        const toolNames = tools.map((t) => t.name).sort();
        assert.deepEqual(toolNames, ['format_number', 'health']);

        await client.close();
    });

    test('health tool has correct schema', async () => {
        const client = new InternalClient();
        await client.connect();

        const tools = await client.listTools();
        const healthTool = tools.find((t) => t.name === 'health');

        assert.ok(healthTool);
        assert.equal(healthTool.name, 'health');
        assert.equal(healthTool.description, 'Check the health and status of the MCP aggregator service');
        assert.ok(healthTool.inputSchema);
        assert.equal(healthTool.inputSchema.type, 'object');

        await client.close();
    });

    test('format_number tool has correct schema', async () => {
        const client = new InternalClient();
        await client.connect();

        const tools = await client.listTools();
        const formatTool = tools.find((t) => t.name === 'format_number');

        assert.ok(formatTool);
        assert.equal(formatTool.name, 'format_number');
        assert.equal(formatTool.description, 'Format a number with thousands separators and optional decimal places');
        assert.ok(formatTool.inputSchema);
        assert.equal(formatTool.inputSchema.type, 'object');

        await client.close();
    });

    test('health tool returns status with required fields', async () => {
        const client = new InternalClient();
        await client.connect();

        const result = await client.callTool('health', {});

        assert.equal(result.isError, false);
        assert.ok(result.content);
        assert.equal(result.content.length, 1);
        assert.equal(result.content[0].type, 'text');

        const data = JSON.parse(result.content[0].text);
        assert.equal(data.status, 'ok');
        assert.ok(typeof data.uptime === 'number');
        assert.ok(data.memory);
        assert.ok(typeof data.pid === 'number');

        await client.close();
    });

    test('health tool works with empty arguments', async () => {
        const client = new InternalClient();
        await client.connect();

        const result = await client.callTool('health', {});
        assert.equal(result.isError, false);

        await client.close();
    });

    test('health tool ignores extra arguments', async () => {
        const client = new InternalClient();
        await client.connect();

        const result = await client.callTool('health', {
            extra: 'ignored',
            more: 'data',
        });

        assert.equal(result.isError, false);
        const data = JSON.parse(result.content[0].text);
        assert.equal(data.status, 'ok');

        await client.close();
    });

    test('format_number formats positive integer correctly', async () => {
        const client = new InternalClient();
        await client.connect();

        const result = await client.callTool('format_number', {
            number: 1234567,
            locale: 'en-US',
        });

        assert.equal(result.isError, false);
        assert.equal(result.content.length, 1);
        assert.equal(result.content[0].type, 'text');
        const data = JSON.parse(result.content[0].text);
        assert.equal(data.formatted, '1,234,567');

        await client.close();
    });

    test('formats decimal number with decimals param', async () => {
        const client = new InternalClient();
        await client.connect();

        const result = await client.callTool('format_number', {
            number: 1234.5,
            decimals: 2,
            locale: 'en-US',
        });

        assert.equal(result.isError, false);
        const data = JSON.parse(result.content[0].text);
        assert.equal(data.formatted, '1,234.50');

        await client.close();
    });

    test('formats negative number correctly', async () => {
        const client = new InternalClient();
        await client.connect();

        const result = await client.callTool('format_number', {
            number: -9876,
            locale: 'en-US',
        });

        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('-'));
        assert.ok(result.content[0].text.includes('9,876'));

        await client.close();
    });

    test('formats zero correctly', async () => {
        const client = new InternalClient();
        await client.connect();

        const result = await client.callTool('format_number', {
            number: 0,
            locale: 'en-US',
        });

        assert.equal(result.isError, false);
        const data = JSON.parse(result.content[0].text);
        assert.equal(data.formatted, '0');

        await client.close();
    });

    test('uses default decimals of 0', async () => {
        const client = new InternalClient();
        await client.connect();

        const result = await client.callTool('format_number', {
            number: 1234.56,
            locale: 'en-US',
        });

        assert.equal(result.isError, false);
        // Default decimals=0 should round to integer
        const data = JSON.parse(result.content[0].text);
        assert.equal(data.formatted, '1,235');

        await client.close();
    });

    test('uses default locale of en-US', async () => {
        const client = new InternalClient();
        await client.connect();

        const result = await client.callTool('format_number', {
            number: 1234,
        });

        assert.equal(result.isError, false);
        const data = JSON.parse(result.content[0].text);
        assert.equal(data.formatted, '1,234');

        await client.close();
    });

    test('rejects non-number input', async () => {
        const client = new InternalClient();
        await client.connect();

        const result = await client.callTool('format_number', {
            number: 'not a number',
            locale: 'en-US',
        });

        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('number parameter must be a number'));

        await client.close();
    });

    test('handles very small numbers', async () => {
        const client = new InternalClient();
        await client.connect();

        const result = await client.callTool('format_number', {
            number: 0.000001,
            decimals: 6,
            locale: 'en-US',
        });

        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('0.000001'));

        await client.close();
    });

    test('handles large numbers', async () => {
        const client = new InternalClient();
        await client.connect();

        const result = await client.callTool('format_number', {
            number: 1234567890123456,
            locale: 'en-US',
        });

        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes(','));

        await client.close();
    });

    test('handles different locales', async () => {
        const client = new InternalClient();
        await client.connect();

        const result = await client.callTool('format_number', {
            number: 1234.56,
            decimals: 2,
            locale: 'de-DE',
        });

        assert.equal(result.isError, false);
        // German locale uses . for thousands and , for decimals
        assert.ok(result.content[0].text.includes('1') && result.content[0].text.includes('234'));

        await client.close();
    });

    test('handles invalid locale gracefully', async () => {
        const client = new InternalClient();
        await client.connect();

        const result = await client.callTool('format_number', {
            number: 1234,
            locale: 'invalid-locale',
        });

        // Should either format with fallback or return error
        assert.ok(result.content[0].text);

        await client.close();
    });

    test('returns error for unknown tool', async () => {
        const client = new InternalClient();
        await client.connect();

        const result = await client.callTool('unknown_tool', {});

        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Tool not found'));

        await client.close();
    });

    test('handles tool call errors gracefully', async () => {
        const client = new InternalClient();
        await client.connect();

        // Call format_number with invalid type
        const result = await client.callTool('format_number', {
            number: null,
        });

        assert.ok(result.isError);
        assert.ok(result.content[0].text);

        await client.close();
    });
});
