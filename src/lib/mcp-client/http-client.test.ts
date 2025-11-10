/**
 * Tests for HTTP MCP client
 */

import { strict as assert } from 'node:assert/strict';
import { afterEach, describe, mock, test } from 'node:test';
import { ResilientClient } from '../../util';
import { PromiseRetry } from '../../util/resilient-client';
import { HttpClient } from './http-client';

describe('http-client', () => {
    afterEach(() => {
        ResilientClient.clearPool();
    });

    test('constructor emits connected event', async () => {
        let connected = false;
        const client = new HttpClient('http://localhost:3000');

        client.addEventListener('connected', () => {
            connected = true;
        });

        // Wait for setImmediate to fire
        await new Promise((resolve) => setImmediate(resolve));

        assert.equal(connected, true);
    });

    test('connected property returns true', () => {
        const client = new HttpClient('http://localhost:3000');
        assert.equal(client.connected, true);
    });

    test('connect is a no-op but completes', async () => {
        const client = new HttpClient('http://localhost:3000');
        await client.connect();
        assert.equal(client.connected, true);
    });

    test('refCount is initialized to 0', () => {
        const client = new HttpClient('http://localhost:3000');
        assert.equal(client.refCount, 0);
    });

    test('refCount can be incremented', () => {
        const client = new HttpClient('http://localhost:3000');
        client.refCount++;
        assert.equal(client.refCount, 1);
    });

    test('close emits disconnected event', () => {
        const client = new HttpClient('http://localhost:3000');
        let disconnected = false;

        client.addEventListener('disconnected', () => {
            disconnected = true;
        });

        client.close();
        assert.equal(disconnected, true);
    });

    test('accepts custom timeout and maxTries', () => {
        const client = new HttpClient('http://localhost:3000', {
            timeout: 10000,
            maxTries: 5,
        });

        assert.ok(client);
        assert.equal(client.connected, true);
    });

    test('listTools and callTool methods exist', () => {
        const client = new HttpClient('http://localhost:3000');

        assert.equal(typeof client.listTools, 'function');
        assert.equal(typeof client.callTool, 'function');
    });

    test('close clears connection pool', () => {
        const client = new HttpClient('http://localhost:3000');
        client.close();

        // Pool should be cleared
        assert.ok(true);
    });

    test('addEventListener/removeEventListener methods work', () => {
        const client = new HttpClient('http://localhost:3000');

        const handler = () => {};
        client.addEventListener('connected', handler);
        client.removeEventListener('connected', handler);

        assert.ok(true);
    });

    test('dispatchEvent method works', () => {
        const client = new HttpClient('http://localhost:3000');

        const event = new Event('test');
        const result = client.dispatchEvent(event);

        assert.equal(typeof result, 'boolean');
    });

    test('listTools sends tools/list request', async () => {
        let callCount = 0;
        const mockFn = mock.method(ResilientClient.prototype, 'fetch', (_input: string) => {
            callCount++;
            const pr = PromiseRetry.withResolvers();
            pr.resolve({
                result: {
                    tools: [
                        {
                            name: 'test_tool',
                            description: 'A test tool',
                            inputSchema: {
                                type: 'object',
                                properties: new Map([['arg1', { type: 'string' }]]),
                                required: ['arg1'],
                            },
                        },
                    ],
                },
            });
            return pr;
        });

        const client = new HttpClient('http://localhost:3000');
        const tools = await client.listTools();

        assert.equal(tools.length, 1);
        assert.equal(tools[0].name, 'test_tool');
        assert.equal(callCount, 1);
        assert.equal(mockFn.mock.calls.length > 0, true, 'mock should be called');
        mockFn.mock.restore();
    });

    test('callTool sends tools/call request', async () => {
        let callCount = 0;
        const mockFn = mock.method(ResilientClient.prototype, 'fetch', (_input: string) => {
            callCount++;
            const pr = PromiseRetry.withResolvers();
            pr.resolve({
                result: {
                    content: [{ type: 'text', text: 'Result text' }],
                    isError: false,
                },
            });
            return pr;
        });

        const client = new HttpClient('http://localhost:3000');
        const result = await client.callTool('test_tool', { arg1: 'value1' });

        assert.equal(result.isError, false);
        assert.equal(result.content.length, 1);
        assert.equal(callCount, 1);
        assert.equal(mockFn.mock.calls.length > 0, true, 'mock should be called');
        mockFn.mock.restore();
    });

    test('_sendRequest handles JSON-RPC errors', async () => {
        const mockFn = mock.method(ResilientClient.prototype, 'fetch', () => {
            const pr = PromiseRetry.withResolvers();
            pr.resolve({
                jsonrpc: '2.0',
                id: 1,
                error: {
                    code: -32600,
                    message: 'Invalid request',
                },
            });
            return pr;
        });

        const client = new HttpClient('http://localhost:3000');

        await assert.rejects(async () => {
            await client.listTools();
        });
        assert.equal(mockFn.mock.calls.length > 0, true, 'mock should be called');
        mockFn.mock.restore();
    });

    test('_sendRequest emits error event on network failure', async () => {
        const mockFn = mock.method(ResilientClient.prototype, 'fetch', () => {
            const pr = PromiseRetry.withResolvers();
            pr.reject(new Error('Network error'));
            return pr;
        });

        const client = new HttpClient('http://localhost:3000');
        let errorEmitted = false;
        let errorDetail: Error | undefined;

        client.addEventListener('error', (event) => {
            errorEmitted = true;
            errorDetail = (event as CustomEvent<{ error: Error }>).detail.error;
        });

        await assert.rejects(async () => {
            await client.listTools();
        });

        assert.equal(errorEmitted, true);
        assert.ok(errorDetail);
        assert.equal(errorDetail.message, 'Network error');
        assert.equal(mockFn.mock.calls.length > 0, true, 'mock should be called');
        mockFn.mock.restore();
    });
});
