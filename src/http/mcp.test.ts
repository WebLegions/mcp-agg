import { ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { app } from '../app';
import { Env } from '../utils';

describe('MCP API - JSON mode', () => {
    test('POST /mcp initialize returns server info', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/mcp',
            payload: {
                jsonrpc: '2.0',
                id: 1,
                method: 'initialize',
                params: {
                    protocolVersion: '2024-11-05',
                    capabilities: {},
                    clientInfo: {
                        name: 'test-client',
                        version: '1.0.0',
                    },
                },
            },
        });

        strictEqual(response.statusCode, 200);
        const json = response.json();
        strictEqual(json.jsonrpc, '2.0');
        strictEqual(json.id, 1);
        ok(json.result);
        strictEqual(json.result.protocolVersion, '2024-11-05');
        ok(json.result.serverInfo);
        strictEqual(json.result.serverInfo.name, Env.appName);
    });

    test('POST /mcp tools/list returns available tools', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/mcp',
            payload: {
                jsonrpc: '2.0',
                id: 2,
                method: 'tools/list',
            },
        });

        strictEqual(response.statusCode, 200);
        const json = response.json();
        strictEqual(json.jsonrpc, '2.0');
        strictEqual(json.id, 2);
        ok(json.result);
        ok(Array.isArray(json.result.tools));
        ok(json.result.tools.length >= 2); // health and format_number

        // Check for health tool
        const healthTool = json.result.tools.find((t: { name: string }) => t.name === 'health');
        ok(healthTool);
        strictEqual(healthTool.description, 'Check the health and status of the MCP aggregator service');

        // Check for format_number tool
        const formatTool = json.result.tools.find((t: { name: string }) => t.name === 'format_number');
        ok(formatTool);
        strictEqual(formatTool.description, 'Format a number with thousands separators and optional decimal places');
    });

    test('POST /mcp tools/call health returns health status', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/mcp',
            payload: {
                jsonrpc: '2.0',
                id: 3,
                method: 'tools/call',
                params: {
                    name: 'health',
                    arguments: {},
                },
            },
        });

        strictEqual(response.statusCode, 200);
        const json = response.json();
        strictEqual(json.jsonrpc, '2.0');
        strictEqual(json.id, 3);
        ok(json.result);
        ok(json.result.content);
        ok(Array.isArray(json.result.content));
        // Health tool now returns JSON with status, uptime, memory, pid
        const healthData = JSON.parse(json.result.content[0].text);
        strictEqual(healthData.status, 'ok');
        ok(typeof healthData.uptime === 'number');
        ok(healthData.memory);
        ok(typeof healthData.pid === 'number');
    });

    test('POST /mcp tools/call format_number formats number correctly', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/mcp',
            payload: {
                jsonrpc: '2.0',
                id: 4,
                method: 'tools/call',
                params: {
                    name: 'format_number',
                    arguments: {
                        number: 123456,
                        locale: 'en-US',
                    },
                },
            },
        });

        strictEqual(response.statusCode, 200);
        const json = response.json();
        strictEqual(json.jsonrpc, '2.0');
        strictEqual(json.id, 4);
        ok(json.result);
        ok(json.result.content);
        ok(Array.isArray(json.result.content));
        // format_number returns JSON with formatted number
        const formatData = JSON.parse(json.result.content[0].text);
        strictEqual(formatData.formatted, '123,456');
        strictEqual(formatData.number, 123456);
        strictEqual(formatData.locale, 'en-US');
    });

    test('POST /mcp tools/call format_number handles large numbers', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/mcp',
            payload: {
                jsonrpc: '2.0',
                id: 5,
                method: 'tools/call',
                params: {
                    name: 'format_number',
                    arguments: {
                        number: 1234567890123456, // Large number
                        locale: 'en-US',
                    },
                },
            },
        });

        strictEqual(response.statusCode, 200);
        const json = response.json();
        ok(json.result);
        ok(json.result.content);
        // Should format the number (JavaScript can handle this)
        ok(json.result.content[0].text.includes(','));
    });

    test('POST /mcp tools/call with unknown tool returns error', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/mcp',
            payload: {
                jsonrpc: '2.0',
                id: 6,
                method: 'tools/call',
                params: {
                    name: 'unknown_tool',
                    arguments: {},
                },
            },
        });

        strictEqual(response.statusCode, 200);
        const json = response.json();
        ok(json.error);
        ok(json.error.message.includes('not found'));
    });

    test('POST /mcp with invalid JSON-RPC version returns error', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/mcp',
            payload: {
                jsonrpc: '1.0',
                id: 7,
                method: 'tools/list',
            },
        });

        strictEqual(response.statusCode, 400);
        const json = response.json();
        strictEqual(json.jsonrpc, '2.0');
        ok(json.error);
    });

    test('POST /mcp with unknown method returns error', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/mcp',
            payload: {
                jsonrpc: '2.0',
                id: 8,
                method: 'unknown/method',
            },
        });

        strictEqual(response.statusCode, 200);
        const json = response.json();
        strictEqual(json.jsonrpc, '2.0');
        ok(json.error);
        ok(json.error.message.includes('not found'));
    });

    test('POST /mcp content-type is application/json', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/mcp',
            payload: {
                jsonrpc: '2.0',
                id: 9,
                method: 'tools/list',
            },
        });

        ok(response.headers['content-type']?.includes('application/json'));
    });

    test('POST /mcp returns session ID in header', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/mcp',
            payload: {
                jsonrpc: '2.0',
                id: 10,
                method: 'tools/list',
            },
        });

        strictEqual(response.statusCode, 200);
        ok(response.headers['mcp-session-id']);
        ok(typeof response.headers['mcp-session-id'] === 'string');
    });

    test('POST /mcp can reuse session ID', async () => {
        // First request creates a session
        const response1 = await app.inject({
            method: 'POST',
            url: '/mcp',
            payload: {
                jsonrpc: '2.0',
                id: 11,
                method: 'tools/list',
            },
        });

        const sessionId = response1.headers['mcp-session-id'] as string;
        ok(sessionId);

        // Second request reuses the session
        const response2 = await app.inject({
            method: 'POST',
            url: '/mcp',
            headers: {
                'mcp-session-id': sessionId,
            },
            payload: {
                jsonrpc: '2.0',
                id: 12,
                method: 'tools/call',
                params: {
                    name: 'health',
                    arguments: {},
                },
            },
        });

        strictEqual(response2.statusCode, 200);
        strictEqual(response2.headers['mcp-session-id'], sessionId);
    });
});

describe('MCP API - SSE mode', () => {
    test('POST /mcp with Accept: text/event-stream returns SSE', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/mcp',
            headers: {
                accept: 'text/event-stream',
            },
            payload: {
                jsonrpc: '2.0',
                id: 100,
                method: 'tools/list',
            },
        });

        strictEqual(response.statusCode, 200);
        ok(response.headers['content-type']?.includes('text/event-stream'));
        ok(response.headers['mcp-session-id']);

        // Parse SSE response
        const body = response.body;
        ok(body.includes('data: '));

        // Extract JSON from SSE data line
        const dataMatch = body.match(/data: (.+)\n/);
        ok(dataMatch);
        const json = JSON.parse(dataMatch[1]);
        strictEqual(json.jsonrpc, '2.0');
        strictEqual(json.id, 100);
        ok(json.result);
        ok(Array.isArray(json.result.tools));
    });

    test('POST /mcp SSE mode returns session ID in header', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/mcp',
            headers: {
                accept: 'text/event-stream',
            },
            payload: {
                jsonrpc: '2.0',
                id: 101,
                method: 'initialize',
                params: {
                    protocolVersion: '2024-11-05',
                    capabilities: {},
                    clientInfo: {
                        name: 'test-client',
                        version: '1.0.0',
                    },
                },
            },
        });

        strictEqual(response.statusCode, 200);
        ok(response.headers['mcp-session-id']);
        ok(response.headers['cache-control']?.includes('no-cache'));
        // Note: POST SSE mode returns single response and closes (no keep-alive)
    });

    test('POST /mcp SSE mode can call tools', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/mcp',
            headers: {
                accept: 'text/event-stream',
            },
            payload: {
                jsonrpc: '2.0',
                id: 102,
                method: 'tools/call',
                params: {
                    name: 'health',
                    arguments: {},
                },
            },
        });

        strictEqual(response.statusCode, 200);

        // Parse SSE response
        const body = response.body;
        const dataMatch = body.match(/data: (.+)\n/);
        ok(dataMatch);
        const json = JSON.parse(dataMatch[1]);
        ok(json.result);
        ok(json.result.content);
        // Health tool returns JSON with status: 'healthy'
        const healthData = JSON.parse(json.result.content[0].text);
        strictEqual(healthData.status, 'ok');
    });
});

describe('MCP API - New Features', () => {
    test('POST /mcp initialize advertises roots capability', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/mcp',
            payload: {
                jsonrpc: '2.0',
                id: 200,
                method: 'initialize',
                params: {
                    protocolVersion: '2024-11-05',
                    capabilities: {},
                    clientInfo: {
                        name: 'test-client',
                        version: '1.0.0',
                    },
                },
            },
        });

        strictEqual(response.statusCode, 200);
        const json = response.json();
        ok(json.result);
        ok(json.result.capabilities);
        ok(json.result.capabilities.roots);
        strictEqual(json.result.capabilities.roots.listChanged, true);
    });

    test('POST /mcp roots/list returns empty roots by default', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/mcp',
            payload: {
                jsonrpc: '2.0',
                id: 201,
                method: 'roots/list',
            },
        });

        strictEqual(response.statusCode, 200);
        const json = response.json();
        strictEqual(json.jsonrpc, '2.0');
        strictEqual(json.id, 201);
        ok(json.result);
        ok(Array.isArray(json.result.roots));
        strictEqual(json.result.roots.length, 0);
    });

    // Note: GET /mcp for SSE streaming cannot be tested with inject()
    // because it's a long-lived connection. Manual testing or integration
    // tests with real HTTP client are needed for SSE stream validation.
});

describe('MCP API - Error handling', () => {
    test('POST /mcp with empty object body returns 400', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/mcp',
            payload: {},
        });

        strictEqual(response.statusCode, 400);
        const json = response.json();
        strictEqual(json.jsonrpc, '2.0');
        ok(json.error);
        strictEqual(json.error.code, -32600);
        ok(json.error.message.includes('Invalid Request') || json.error.message.includes('Invalid JSON-RPC'));
    });

    test('POST /mcp with array body returns 400', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/mcp',
            payload: [],
        });

        strictEqual(response.statusCode, 400);
        const json = response.json();
        strictEqual(json.jsonrpc, '2.0');
        ok(json.error);
        strictEqual(json.error.code, -32600);
    });

    test('POST /mcp SSE mode with empty object body returns 400', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/mcp',
            headers: {
                accept: 'text/event-stream',
            },
            payload: {},
        });

        strictEqual(response.statusCode, 400);
        ok(response.headers['content-type']?.includes('text/event-stream'));
        ok(response.headers['mcp-session-id']);

        // Parse SSE response
        const body = response.body;
        ok(body.includes('data: '));
        const dataMatch = body.match(/data: (.+)\n/);
        ok(dataMatch);
        const json = JSON.parse(dataMatch[1]);
        strictEqual(json.jsonrpc, '2.0');
        ok(json.error);
        strictEqual(json.error.code, -32600);
    });

    test('POST /mcp SSE mode with invalid JSON-RPC version returns 400', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/mcp',
            headers: {
                accept: 'text/event-stream',
            },
            payload: {
                jsonrpc: '1.0',
                id: 300,
                method: 'tools/list',
            },
        });

        strictEqual(response.statusCode, 400);
        ok(response.headers['content-type']?.includes('text/event-stream'));

        // Parse SSE response
        const body = response.body;
        const dataMatch = body.match(/data: (.+)\n/);
        ok(dataMatch);
        const json = JSON.parse(dataMatch[1]);
        strictEqual(json.jsonrpc, '2.0');
        ok(json.error);
        ok(json.error.message.includes('Invalid JSON-RPC version'));
    });

    test('POST /mcp with notification (no id) returns 204', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/mcp',
            payload: {
                jsonrpc: '2.0',
                method: 'notifications/initialized',
            },
        });

        strictEqual(response.statusCode, 204);
    });
});

describe('MCP API - Session management', () => {
    test('POST /mcp reuses existing session when session ID provided', async () => {
        // First request creates a session
        const response1 = await app.inject({
            method: 'POST',
            url: '/mcp',
            payload: {
                jsonrpc: '2.0',
                id: 400,
                method: 'initialize',
                params: {
                    protocolVersion: '2024-11-05',
                    capabilities: {},
                    clientInfo: {
                        name: 'test-client',
                        version: '1.0.0',
                    },
                },
            },
        });

        const sessionId = response1.headers['mcp-session-id'] as string;
        ok(sessionId);

        // Second request with same session ID
        const response2 = await app.inject({
            method: 'POST',
            url: '/mcp',
            headers: {
                'mcp-session-id': sessionId,
            },
            payload: {
                jsonrpc: '2.0',
                id: 401,
                method: 'tools/list',
            },
        });

        strictEqual(response2.statusCode, 200);
        strictEqual(response2.headers['mcp-session-id'], sessionId);

        // Third request with same session ID
        const response3 = await app.inject({
            method: 'POST',
            url: '/mcp',
            headers: {
                'mcp-session-id': sessionId,
            },
            payload: {
                jsonrpc: '2.0',
                id: 402,
                method: 'tools/call',
                params: {
                    name: 'health',
                    arguments: {},
                },
            },
        });

        strictEqual(response3.statusCode, 200);
        strictEqual(response3.headers['mcp-session-id'], sessionId);
    });
});
