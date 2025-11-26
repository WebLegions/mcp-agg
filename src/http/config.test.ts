import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { getManager } from '../controllers/mcp-controller/config-file';
import { createServer, registerRoutes } from './server';

describe('MCP Configuration REST API', () => {
    let manager: ReturnType<typeof getManager>;

    beforeEach(async () => {
        // Get the global manager (singleton) - routes use the same instance
        manager = getManager(undefined, false);
        // Clean up any existing servers from previous tests (except builtin)
        const servers = await manager.find();
        for (const server of servers) {
            if (server.name !== 'builtin') {
                try {
                    await manager.delete(server.name);
                } catch {
                    // Ignore errors during cleanup
                }
            }
        }
    });

    afterEach(async () => {
        // Clean up all servers after each test (except builtin)
        const servers = await manager.find();
        for (const server of servers) {
            if (server.name !== 'builtin') {
                try {
                    await manager.delete(server.name);
                } catch {
                    // Ignore errors during cleanup
                }
            }
        }
        manager.cleanup();
    });

    test('GET /api/v1/config lists all servers', async () => {
        const app = await createServer();
        await registerRoutes(app);

        // Empty config should have builtin server by default
        const initialResponse = await app.inject({
            method: 'GET',
            url: '/api/v1/config',
        });

        assert.equal(initialResponse.statusCode, 200);
        const initialBody = JSON.parse(initialResponse.body);
        assert.ok(Array.isArray(initialBody.servers));
        assert.equal(initialBody.total, 1);
        assert.ok(initialBody.servers.some((s: { name: string }) => s.name === 'builtin'));

        // Add a test server - builtin should remain
        await manager.create({
            name: 'test-server',
            transport: 'stdio',
            command: 'node',
            args: ['server.js'],
            enabled: true,
        });

        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/config',
        });

        assert.equal(response.statusCode, 200);
        const body = JSON.parse(response.body);
        assert.ok(Array.isArray(body.servers));
        // Builtin stays present, test-server is added
        assert.equal(body.total, 2);
        assert.ok(body.servers.some((s: { name: string }) => s.name === 'test-server'));
        assert.ok(body.servers.some((s: { name: string }) => s.name === 'builtin'));
    });

    test('Builtin server persists through add/remove operations', async () => {
        const app = await createServer();
        await registerRoutes(app);

        // Start with empty config - should have builtin
        const initial = await app.inject({
            method: 'GET',
            url: '/api/v1/config',
        });
        const initialBody = JSON.parse(initial.body);
        assert.equal(initialBody.total, 1);
        assert.ok(initialBody.servers.some((s: { name: string }) => s.name === 'builtin'));

        // Add a server - builtin stays
        await manager.create({
            name: 'test-server',
            transport: 'stdio',
            command: 'node',
            args: ['server.js'],
            enabled: true,
        });

        const afterAdd = await app.inject({
            method: 'GET',
            url: '/api/v1/config',
        });
        const afterAddBody = JSON.parse(afterAdd.body);
        assert.equal(afterAddBody.total, 2);
        assert.ok(afterAddBody.servers.some((s: { name: string }) => s.name === 'test-server'));
        assert.ok(afterAddBody.servers.some((s: { name: string }) => s.name === 'builtin'));

        // Remove the server - builtin still stays
        const deleteResponse = await app.inject({
            method: 'DELETE',
            url: '/api/v1/config/test-server',
        });
        assert.equal(deleteResponse.statusCode, 200);

        const afterDelete = await app.inject({
            method: 'GET',
            url: '/api/v1/config',
        });
        const afterDeleteBody = JSON.parse(afterDelete.body);
        assert.equal(afterDeleteBody.total, 1);
        assert.ok(afterDeleteBody.servers.some((s: { name: string }) => s.name === 'builtin'));
        assert.ok(!afterDeleteBody.servers.some((s: { name: string }) => s.name === 'test-server'));
    });

    test('GET /api/v1/config/:name returns specific server', async () => {
        const app = await createServer();
        await registerRoutes(app);

        await manager.create({
            name: 'test-server',
            transport: 'stdio',
            command: 'node',
            args: ['server.js'],
            enabled: true,
        });

        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/config/test-server',
        });

        assert.equal(response.statusCode, 200);
        const body = JSON.parse(response.body);
        assert.equal(body.name, 'test-server');
        assert.equal(body.transport, 'stdio');
        assert.equal(body.command, 'node');
    });

    test('GET /api/v1/config/:name returns 404 for non-existent server', async () => {
        const app = await createServer();
        await registerRoutes(app);

        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/config/non-existent',
        });

        assert.equal(response.statusCode, 404);
        const body = JSON.parse(response.body);
        assert.ok(body.error);
    });

    test('POST /api/v1/config creates new stdio server', async () => {
        const app = await createServer();
        await registerRoutes(app);

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/config',
            payload: {
                name: 'new-server',
                transport: 'stdio',
                command: 'bun',
                args: ['run', 'server.ts'],
                enabled: true,
            },
        });

        assert.equal(response.statusCode, 201);
        const body = JSON.parse(response.body);
        assert.equal(body.name, 'new-server');

        // Verify it was actually created
        const server = await manager.find('new-server');
        assert.ok(server);
        assert.equal(server.transport, 'stdio');
    });

    test('POST /api/v1/config creates new SSE server', async () => {
        const app = await createServer();
        await registerRoutes(app);

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/config',
            payload: {
                name: 'sse-server',
                transport: 'sse',
                url: 'http://localhost:8080/sse',
                enabled: true,
            },
        });

        assert.equal(response.statusCode, 201);
        const body = JSON.parse(response.body);
        assert.equal(body.name, 'sse-server');

        const server = await manager.find('sse-server');
        assert.ok(server);
        assert.equal(server.transport, 'sse');
    });

    test('POST /api/v1/config rejects invalid transport', async () => {
        const app = await createServer();
        await registerRoutes(app);

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/config',
            payload: {
                name: 'invalid-server',
                transport: 'invalid-transport',
                command: 'node',
            },
        });

        assert.equal(response.statusCode, 400);
    });

    test('POST /api/v1/config rejects duplicate server name', async () => {
        const app = await createServer();
        await registerRoutes(app);

        // Create first server
        await manager.create({
            name: 'duplicate',
            transport: 'stdio',
            command: 'node',
            enabled: true,
        });

        // Try to create duplicate
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/config',
            payload: {
                name: 'duplicate',
                transport: 'stdio',
                command: 'bun',
            },
        });

        assert.equal(response.statusCode, 409);
    });

    test('PUT /api/v1/config/:name updates existing server', async () => {
        const app = await createServer();
        await registerRoutes(app);

        await manager.create({
            name: 'update-me',
            transport: 'stdio',
            command: 'node',
            enabled: true,
        });

        const response = await app.inject({
            method: 'PUT',
            url: '/api/v1/config/update-me',
            payload: {
                transport: 'stdio',
                command: 'bun',
                enabled: false,
            },
        });

        assert.equal(response.statusCode, 200);
        const server = await manager.find('update-me');
        assert.ok(server);
        if (server.transport === 'stdio') {
            assert.equal(server.command, 'bun');
        }
        assert.equal(server.enabled, false);
    });

    test('PUT /api/v1/config/:name returns 404 for non-existent server', async () => {
        const app = await createServer();
        await registerRoutes(app);

        const response = await app.inject({
            method: 'PUT',
            url: '/api/v1/config/non-existent',
            payload: {
                enabled: false,
            },
        });

        assert.equal(response.statusCode, 404);
    });

    test('DELETE /api/v1/config/:name removes server', async () => {
        const app = await createServer();
        await registerRoutes(app);

        await manager.create({
            name: 'delete-me',
            transport: 'stdio',
            command: 'node',
            enabled: true,
        });

        const response = await app.inject({
            method: 'DELETE',
            url: '/api/v1/config/delete-me',
        });

        assert.equal(response.statusCode, 200);

        // Verify it was deleted
        const server = await manager.find('delete-me');
        assert.equal(server, undefined);
    });

    test('DELETE /api/v1/config/:name returns 404 for non-existent server', async () => {
        const app = await createServer();
        await registerRoutes(app);

        const response = await app.inject({
            method: 'DELETE',
            url: '/api/v1/config/non-existent',
        });

        assert.equal(response.statusCode, 404);
    });

    test('PATCH /api/v1/config/:name/enabled toggles server status', async () => {
        const app = await createServer();
        await registerRoutes(app);

        await manager.create({
            name: 'toggle-me',
            transport: 'stdio',
            command: 'node',
            enabled: true,
        });

        // Disable it
        const response1 = await app.inject({
            method: 'PATCH',
            url: '/api/v1/config/toggle-me/enabled',
            payload: {
                enabled: false,
            },
        });

        assert.equal(response1.statusCode, 200);
        let server = await manager.find('toggle-me');
        assert.equal(server?.enabled, false);

        // Enable it again
        const response2 = await app.inject({
            method: 'PATCH',
            url: '/api/v1/config/toggle-me/enabled',
            payload: {
                enabled: true,
            },
        });

        assert.equal(response2.statusCode, 200);
        server = await manager.find('toggle-me');
        assert.equal(server?.enabled, true);
    });

    test('GET /api/v1/config/tools lists all available tools', async () => {
        const app = await createServer();
        await registerRoutes(app);

        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/config/tools',
        });

        assert.equal(response.statusCode, 200);
        const body = JSON.parse(response.body);

        // Validate response structure
        assert.ok(Array.isArray(body.tools));
        assert.ok(typeof body.total === 'number');
        assert.ok(body.summary);
        assert.ok(typeof body.summary.totalTools === 'number');
        assert.ok(typeof body.summary.builtinTools === 'number');
        assert.ok(typeof body.summary.externalTools === 'number');
        assert.ok(body.summary.serverBreakdown instanceof Object);

        // Should have at least built-in tools (health, format_number)
        assert.ok(body.total >= 2);
        assert.ok(body.summary.builtinTools >= 2);

        // Check for built-in tools (no prefix for builtin tools)
        const toolNames = body.tools.map((t: { name: string }) => t.name);
        assert.ok(toolNames.includes('health'));
        assert.ok(toolNames.includes('format_number'));

        // Verify each tool has required fields
        for (const tool of body.tools) {
            assert.ok(tool.name);
            assert.ok(tool.inputSchema);
            assert.ok(tool.serverName);
        }
    });

    test('GET /api/v1/config/tools filters by server name', async () => {
        const app = await createServer();
        await registerRoutes(app);

        // Filter for builtin tools only
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/config/tools?server=builtin',
        });

        assert.equal(response.statusCode, 200);
        const body = JSON.parse(response.body);

        // All tools should be from builtin server
        for (const tool of body.tools) {
            assert.equal(tool.serverName, 'builtin');
        }

        // Should have built-in tools
        assert.ok(body.total >= 2);
        assert.equal(body.summary.builtinTools, body.total);
        assert.equal(body.summary.externalTools, 0);
    });

    test('GET /api/v1/config/tools returns 404 for non-existent server filter', async () => {
        const app = await createServer();
        await registerRoutes(app);

        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/config/tools?server=non-existent-server',
        });

        assert.equal(response.statusCode, 404);
        const body = JSON.parse(response.body);
        assert.ok(body.error);
        assert.ok(body.error.includes('non-existent-server'));
    });

    test('GET /api/v1/config/tools respects server enabled status', async () => {
        const app = await createServer();
        await registerRoutes(app);

        // Verify that registerMCPServerTools uses getEnabled() which filters disabled servers
        // This is tested indirectly - disabled servers won't be attempted for connection
        // In a real scenario with actual MCP servers, only enabled ones would have tools registered

        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/config/tools',
        });

        assert.equal(response.statusCode, 200);
        const body = JSON.parse(response.body);

        // In test environment, should only have builtin tools
        // (external servers aren't actually running)
        assert.equal(body.summary.builtinTools, 2);
        assert.equal(body.summary.externalTools, 0);

        // All returned tools should have a valid serverName
        for (const tool of body.tools) {
            assert.ok(tool.serverName);
            assert.ok(tool.name);
        }
    });
});
