/**
 * Tests for MCP Configuration Manager
 */

import { deepStrictEqual, ok, strictEqual } from 'node:assert/strict';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { describe, test } from 'node:test';
import { sleep } from '../../shared/utils/time';
import { MCPConfigManager } from './config';

// Helper function to run a test with an isolated manager
async function withManager<T>(testName: string, fn: (manager: MCPConfigManager) => Promise<T>): Promise<T> {
    // Ensure test directory exists
    const testConfigDir = path.resolve(__dirname, '../../var/test');
    mkdirSync(testConfigDir, { recursive: true });

    const safeName = testName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const testPath = path.join(testConfigDir, `test-mcp-${safeName}.json`);

    // Clean up any existing files
    if (existsSync(testPath)) unlinkSync(testPath);
    if (existsSync(`${testPath}.backup`)) unlinkSync(`${testPath}.backup`);

    const manager = new MCPConfigManager(testPath);

    try {
        return await fn(manager);
    } finally {
        // Cleanup test files
        if (existsSync(testPath)) unlinkSync(testPath);
        if (existsSync(`${testPath}.backup`)) unlinkSync(`${testPath}.backup`);
        manager.cleanup();
    }
}

describe('MCP Config file', () => {
    test('creates default config with builtin server if file does not exist', async (t) => {
        await withManager(t.name, async (manager) => {
            const config = await manager.read();
            strictEqual(config.mcpServers.size, 1);
            ok(config.mcpServers.has('builtin'));
            const builtin = config.mcpServers.get('builtin');
            ok(builtin);
            strictEqual(builtin.name, 'builtin');
            strictEqual(builtin.description, 'Built-in aggregator tools (health, format_number)');
        });
    });

    test('reads existing config file', async (t) => {
        await withManager(t.name, async (manager) => {
            const serverConfig = MCPConfigManager.create('test-server', 'stdio', 'node', ['server.js']);
            await manager.upsertServer(serverConfig);

            const config = await manager.read();
            ok(config.mcpServers.has('test-server'));
            const server = config.mcpServers.get('test-server');
            ok(server);
            strictEqual(server.transport, 'stdio');
            if (server.transport === 'stdio') {
                strictEqual(server.command, 'node');
            }
            // builtin should always be present
            strictEqual(config.mcpServers.has('builtin'), true);
        });
    });

    test('returns default config with builtin on invalid schema', async (t) => {
        await withManager(t.name, async (manager) => {
            const configPath = Object(manager)._configPath as string;
            const invalidConfig = { invalid: 'structure' };
            await fs.writeFile(configPath, JSON.stringify(invalidConfig), 'utf8');

            const config = await manager.read();
            strictEqual(config.mcpServers.size, 1);
            ok(config.mcpServers.has('builtin'));
        });
    });

    test('writes config to file', async (t) => {
        await withManager(t.name, async (manager) => {
            const configPath = Object(manager)._configPath as string;
            const serverConfig = MCPConfigManager.create('write-test', 'sse', 'http://example.com/sse');
            await manager.upsertServer(serverConfig);

            ok(existsSync(configPath));

            const config = await manager.read();
            ok(config.mcpServers.has('write-test'));
            const server = config.mcpServers.get('write-test');
            ok(server);
            strictEqual(server.transport, 'sse');
            if (server.transport === 'sse') {
                strictEqual(server.url, 'http://example.com/sse');
            }
        });
    });

    test('creates backup when overwriting', async (t) => {
        await withManager(t.name, async (manager) => {
            const configPath = Object(manager)._configPath as string;
            const server1 = MCPConfigManager.create('server1', 'stdio', 'node');
            await manager.upsertServer(server1);

            const server2 = MCPConfigManager.create('server2', 'stdio', 'bun');
            await manager.upsertServer(server2);

            ok(existsSync(`${configPath}.backup`));

            // Verify backup contains old config (server1 only)
            const backupManager = new MCPConfigManager(`${configPath}.backup`);
            const backupConfig = await backupManager.read();
            ok(backupConfig.mcpServers.has('server1'));
            ok(!backupConfig.mcpServers.has('server2'));

            // Verify current contains both servers
            const currentConfig = await manager.read();
            ok(currentConfig.mcpServers.has('server1'));
            ok(currentConfig.mcpServers.has('server2'));
        });
    });

    test('creates stdio server config', async () => {
        const config = MCPConfigManager.create('test', 'stdio', 'node', ['server.js']);
        deepStrictEqual(config, {
            name: 'test',
            transport: 'stdio',
            command: 'node',
            args: ['server.js'],
            enabled: true,
        });
    });

    test('creates sse server config', async () => {
        const config = MCPConfigManager.create('test', 'sse', 'http://example.com');
        deepStrictEqual(config, {
            name: 'test',
            transport: 'sse',
            url: 'http://example.com',
            enabled: true,
        });
    });

    test('creates http server config', async () => {
        const config = MCPConfigManager.create('test', 'http', 'http://example.com');
        deepStrictEqual(config, {
            name: 'test',
            transport: 'http',
            url: 'http://example.com',
            enabled: true,
        });
    });

    test('includes environment variables', async () => {
        const env = new Map([['API_KEY', 'secret']]);
        const config = MCPConfigManager.create('test', 'stdio', 'node', [], env);
        deepStrictEqual(config.env, env);
    });

    test('respects enabled flag', async () => {
        const config = MCPConfigManager.create('test', 'stdio', 'node', [], undefined, false);
        strictEqual(config.enabled, false);
    });

    test('validates correct stdio config', async (t) => {
        await withManager(t.name, async (manager) => {
            const config = MCPConfigManager.create('test', 'stdio', 'node');
            ok(manager.isValidServer(config));
        });
    });

    test('validates correct sse config', async (t) => {
        await withManager(t.name, async (manager) => {
            const config = MCPConfigManager.create('test', 'sse', 'http://example.com');
            ok(manager.isValidServer(config));
        });
    });

    test('rejects invalid config', async (t) => {
        await withManager(t.name, async (manager) => {
            ok(!manager.isValidServer({ invalid: 'config' }));
        });
    });

    test('rejects missing required fields', async (t) => {
        await withManager(t.name, async (manager) => {
            ok(!manager.isValidServer({ name: 'test' }));
        });
    });

    test('getAllServers returns builtin server for default config', async (t) => {
        await withManager(t.name, async (manager) => {
            const servers = await manager.getAllServers();
            strictEqual(servers.length, 1);
            strictEqual(servers[0].name, 'builtin');
            strictEqual(servers[0].description, 'Built-in aggregator tools (health, format_number)');
        });
    });

    test('upsertServer adds new server', async (t) => {
        await withManager(t.name, async (manager) => {
            const serverConfig = MCPConfigManager.create('new-server', 'stdio', 'node', ['test.js']);
            await manager.upsertServer(serverConfig);

            const servers = await manager.getAllServers();
            // builtin stays present, new server is added
            strictEqual(servers.length, 2);
            const newServer = servers.find((s) => s.name === 'new-server');
            ok(newServer);
            deepStrictEqual(newServer, serverConfig);
        });
    });

    test('upsertServer updates existing server', async (t) => {
        await withManager(t.name, async (manager) => {
            const serverConfig1 = MCPConfigManager.create('server', 'stdio', 'node');
            await manager.upsertServer(serverConfig1);

            const serverConfig2 = MCPConfigManager.create('server', 'stdio', 'bun');
            await manager.upsertServer(serverConfig2);

            const servers = await manager.getAllServers();
            strictEqual(servers.length, 2); // server + builtin
            const updatedServer = servers.find((s) => s.name === 'server');
            ok(updatedServer);
            if (updatedServer.transport === 'stdio') {
                strictEqual(updatedServer.command, 'bun');
            }
        });
    });

    test('getServer returns undefined for non-existent server', async (t) => {
        await withManager(t.name, async (manager) => {
            const server = await manager.getServer('non-existent');
            strictEqual(server, undefined);
        });
    });

    test('getServer returns server config', async (t) => {
        await withManager(t.name, async (manager) => {
            const serverConfig = MCPConfigManager.create('test-server', 'stdio', 'node');
            await manager.upsertServer(serverConfig);

            const server = await manager.getServer('test-server');
            deepStrictEqual(server, serverConfig);
        });
    });

    test('removeServer removes existing server', async (t) => {
        await withManager(t.name, async (manager) => {
            const serverConfig = MCPConfigManager.create('to-remove', 'stdio', 'node');
            await manager.upsertServer(serverConfig);

            const removed = await manager.removeServer('to-remove');
            ok(removed);

            const servers = await manager.getAllServers();
            // After removing the last server, builtin appears again
            strictEqual(servers.length, 1);
            strictEqual(servers[0].name, 'builtin');
        });
    });

    test('removeServer returns false for non-existent server', async (t) => {
        await withManager(t.name, async (manager) => {
            const removed = await manager.removeServer('non-existent');
            strictEqual(removed, false);
        });
    });

    test('serverExists returns true for existing server', async (t) => {
        await withManager(t.name, async (manager) => {
            const serverConfig = MCPConfigManager.create('exists', 'stdio', 'node');
            await manager.upsertServer(serverConfig);

            const exists = await manager.serverExists('exists');
            ok(exists);
        });
    });

    test('serverExists returns false for non-existent server', async (t) => {
        await withManager(t.name, async (manager) => {
            const exists = await manager.serverExists('non-existent');
            strictEqual(exists, false);
        });
    });

    test('getEnabledServers returns only enabled servers', async (t) => {
        await withManager(t.name, async (manager) => {
            const enabled1 = MCPConfigManager.create('enabled1', 'stdio', 'node', [], undefined, true);
            const enabled2 = MCPConfigManager.create('enabled2', 'stdio', 'bun', [], undefined, true);
            const disabled = MCPConfigManager.create('disabled', 'stdio', 'deno', [], undefined, false);

            await manager.upsertServer(enabled1);
            await manager.upsertServer(enabled2);
            await manager.upsertServer(disabled);

            const enabledServers = await manager.getEnabled();
            strictEqual(enabledServers.length, 3); // enabled1, enabled2, + builtin
            ok(enabledServers.every((s) => s.enabled !== false));
        });
    });

    test('setServerEnabled enables server', async (t) => {
        await withManager(t.name, async (manager) => {
            const serverConfig = MCPConfigManager.create('test', 'stdio', 'node', [], undefined, false);
            await manager.upsertServer(serverConfig);

            await manager.enable('test', true);

            const server = await manager.getServer('test');
            strictEqual(server?.enabled, true);
        });
    });

    test('setServerEnabled disables server', async (t) => {
        await withManager(t.name, async (manager) => {
            const serverConfig = MCPConfigManager.create('test', 'stdio', 'node', [], undefined, true);
            await manager.upsertServer(serverConfig);

            await manager.enable('test', false);

            const server = await manager.getServer('test');
            strictEqual(server?.enabled, false);
        });
    });

    test('setServerEnabled throws for non-existent server', async (t) => {
        await withManager(t.name, async (manager) => {
            let error: Error | undefined;
            try {
                await manager.enable('non-existent', true);
            } catch (err) {
                error = err as Error;
            }
            ok(error);
            ok(error?.message.includes('not found'));
        });
    });

    test('handles multiple servers correctly', async (t) => {
        await withManager(t.name, async (manager) => {
            const servers = [
                MCPConfigManager.create('server1', 'stdio', 'node'),
                MCPConfigManager.create('server2', 'sse', 'http://example.com'),
                MCPConfigManager.create('server3', 'http', 'http://api.example.com'),
            ];

            for (const server of servers) {
                await manager.upsertServer(server);
            }

            const allServers = await manager.getAllServers();
            strictEqual(allServers.length, 4); // 3 + builtin
        });
    });

    test('maintains server order across operations', async (t) => {
        await withManager(t.name, async (manager) => {
            const server1 = MCPConfigManager.create('a-server', 'stdio', 'node');
            const server2 = MCPConfigManager.create('b-server', 'stdio', 'bun');
            const server3 = MCPConfigManager.create('c-server', 'stdio', 'deno');

            await manager.upsertServer(server1);
            await manager.upsertServer(server2);
            await manager.upsertServer(server3);

            // Remove middle server
            await manager.removeServer('b-server');

            const servers = await manager.getAllServers();
            strictEqual(servers.length, 3); // a, c, + builtin
            const nonBuiltinServers = servers.filter((s) => s.name !== 'builtin');
            strictEqual(nonBuiltinServers.length, 2);
            strictEqual(nonBuiltinServers[0].name, 'a-server');
            strictEqual(nonBuiltinServers[1].name, 'c-server');
        });
    });

    test('emits config:changed event on upsertServer (add)', async (t) => {
        await withManager(t.name, async (manager) => {
            // Watcher is automatically started in constructor
            let eventFired = false;

            manager.on('config:changed', () => {
                eventFired = true;
            });

            const serverConfig = MCPConfigManager.create('test', 'stdio', 'node');
            await manager.upsertServer(serverConfig);

            // Wait for file watcher to detect the change
            await sleep(2);

            ok(eventFired);
        });
    });

    test('emits config:changed event on upsertServer (update)', async (t) => {
        await withManager(t.name, async (manager) => {
            const serverConfig1 = MCPConfigManager.create('test', 'stdio', 'node');
            await manager.upsertServer(serverConfig1);

            // Watcher is automatically started in constructor
            let eventFired = false;

            manager.on('config:changed', () => {
                eventFired = true;
            });

            const serverConfig2 = MCPConfigManager.create('test', 'stdio', 'bun');
            await manager.upsertServer(serverConfig2);

            // Wait for file watcher to detect the change
            await sleep(2);

            ok(eventFired);
        });
    });

    test('emits config:changed event on removeServer', async (t) => {
        await withManager(t.name, async (manager) => {
            const serverConfig = MCPConfigManager.create('test', 'stdio', 'node');
            await manager.upsertServer(serverConfig);

            // Watcher is automatically started in constructor
            let eventFired = false;

            manager.on('config:changed', () => {
                eventFired = true;
            });

            await manager.removeServer('test');

            // Wait for file watcher to detect the change
            await sleep(2);

            ok(eventFired);
        });
    });

    test('emits config:changed event on setServerEnabled', async (t) => {
        await withManager(t.name, async (manager) => {
            const serverConfig = MCPConfigManager.create('test', 'stdio', 'node', [], undefined, true);
            await manager.upsertServer(serverConfig);

            // Watcher is automatically started in constructor
            let eventFired = 0;
            manager.on('config:changed', () => {
                eventFired++;
            });

            await manager.enable('test', false);

            // Wait for file watcher to detect the change
            await sleep(2);
            strictEqual(eventFired, 1);
        });
    });

    test('detects external file changes', async (t) => {
        await withManager(t.name, async (manager) => {
            let eventFired = 0;
            manager.on('config:changed', () => {
                eventFired++;
            });

            // Create initial server >> fire first
            const serverConfig = MCPConfigManager.create('initial', 'stdio', 'node');
            await manager.upsertServer(serverConfig);

            // Wait for first event to complete
            await sleep(2);

            // Simulate external file change by writing directly >> fire second
            const configPath = Object(manager)._configPath as string;
            await fs.writeFile(configPath, JSON.stringify({ test: true }, null, 2), 'utf-8');

            // Wait for file watcher to detect the change (increased timeout for reliability)
            await sleep(2);

            // Verify event was fired (at least 2 events: initial upsert + external change)
            ok(eventFired >= 2, `Expected at least 2 events, got ${eventFired}`);
        });
    });

    test('does not start file watcher when watch=false', async (t) => {
        const manager = new MCPConfigManager(t.name, false);

        try {
            let eventFired = 0;
            manager.on('config:changed', () => {
                eventFired++;
            });

            // Add a server
            const serverConfig = MCPConfigManager.create('test-server', 'stdio', 'node');
            await manager.upsertServer(serverConfig);

            // Wait to ensure no events fire from file watching
            await sleep(2);

            // Verify no watch events fired (only the direct modification events count)
            // Since we're not watching, external file changes won't trigger events
            strictEqual(eventFired, 0, 'No config:changed events should fire when watch=false');

            // Verify the manager still works normally for direct operations
            const config = await manager.read();
            ok(config.mcpServers.has('test-server'), 'Server should be added');
        } finally {
        }
    });
});
