/**
 * Tests for MCP Configuration Manager
 */

import { deepStrictEqual, ok, strictEqual } from 'node:assert/strict';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { describe, test } from 'node:test';
import { sleep } from '../../shared/utils/time';
import { MCPConfigManager } from './config-file';

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
            await manager.create(serverConfig);

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
            await manager.create(serverConfig);

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
            await manager.create(server1);

            const server2 = MCPConfigManager.create('server2', 'stdio', 'bun');
            await manager.create(server2);

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
            const servers = await manager.find();
            strictEqual(servers.length, 1);
            strictEqual(servers[0].name, 'builtin');
            strictEqual(servers[0].description, 'Built-in aggregator tools (health, format_number)');
        });
    });

    test('upsertServer adds new server', async (t) => {
        await withManager(t.name, async (manager) => {
            const serverConfig = MCPConfigManager.create('new-server', 'stdio', 'node', ['test.js']);
            await manager.create(serverConfig);

            const servers = await manager.find();
            // builtin stays present, new server is added
            strictEqual(servers.length, 2);
            const newServer = servers.find((s) => s.name === 'new-server');
            ok(newServer);
            deepStrictEqual(newServer, serverConfig);
        });
    });

    test('update modifies existing server', async (t) => {
        await withManager(t.name, async (manager) => {
            const serverConfig1 = MCPConfigManager.create('server', 'stdio', 'node');
            await manager.create(serverConfig1);

            // Update the existing server
            await manager.update('server', { command: 'bun' });

            const servers = await manager.find();
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
            const server = await manager.find('non-existent');
            strictEqual(server, undefined);
        });
    });

    test('getServer returns server config', async (t) => {
        await withManager(t.name, async (manager) => {
            const serverConfig = MCPConfigManager.create('test-server', 'stdio', 'node');
            await manager.create(serverConfig);

            const server = await manager.find('test-server');
            deepStrictEqual(server, serverConfig);
        });
    });

    test('delete removes existing server', async (t) => {
        await withManager(t.name, async (manager) => {
            const serverConfig = MCPConfigManager.create('to-remove', 'stdio', 'node');
            await manager.create(serverConfig);

            await manager.delete('to-remove');

            const servers = await manager.find();
            // After removing the last server, builtin appears again
            strictEqual(servers.length, 1);
            strictEqual(servers[0].name, 'builtin');
        });
    });

    test('delete throws for non-existent server', async (t) => {
        await withManager(t.name, async (manager) => {
            let error: Error | undefined;
            try {
                await manager.delete('non-existent');
            } catch (err) {
                error = err as Error;
            }
            ok(error);
            ok(error?.message.includes('not found'));
        });
    });

    test('serverExists returns true for existing server', async (t) => {
        await withManager(t.name, async (manager) => {
            const serverConfig = MCPConfigManager.create('exists', 'stdio', 'node');
            await manager.create(serverConfig);

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

            await manager.create(enabled1);
            await manager.create(enabled2);
            await manager.create(disabled);

            const enabledServers = await manager.getEnabled();
            strictEqual(enabledServers.length, 3); // enabled1, enabled2, + builtin
            ok(enabledServers.every((s) => s.enabled !== false));
        });
    });

    test('setServerEnabled enables server', async (t) => {
        await withManager(t.name, async (manager) => {
            const serverConfig = MCPConfigManager.create('test', 'stdio', 'node', [], undefined, false);
            await manager.create(serverConfig);

            await manager.update('test', { enabled: true });

            const server = await manager.find('test');
            strictEqual(server?.enabled, true);
        });
    });

    test('setServerEnabled disables server', async (t) => {
        await withManager(t.name, async (manager) => {
            const serverConfig = MCPConfigManager.create('test', 'stdio', 'node', [], undefined, true);
            await manager.create(serverConfig);

            await manager.update('test', { enabled: false });

            const server = await manager.find('test');
            strictEqual(server?.enabled, false);
        });
    });

    test('setServerEnabled throws for non-existent server', async (t) => {
        await withManager(t.name, async (manager) => {
            let error: Error | undefined;
            try {
                await manager.update('non-existent', { enabled: true });
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
                await manager.create(server);
            }

            const allServers = await manager.find();
            strictEqual(allServers.length, 4); // 3 + builtin
        });
    });

    test('maintains server order across operations', async (t) => {
        await withManager(t.name, async (manager) => {
            const server1 = MCPConfigManager.create('a-server', 'stdio', 'node');
            const server2 = MCPConfigManager.create('b-server', 'stdio', 'bun');
            const server3 = MCPConfigManager.create('c-server', 'stdio', 'deno');

            await manager.create(server1);
            await manager.create(server2);
            await manager.create(server3);

            // Remove middle server
            await manager.delete('b-server');

            const servers = await manager.find();
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
            await manager.create(serverConfig);

            // Wait for file watcher to detect the change
            await sleep(2);

            ok(eventFired);
        });
    });

    test('emits config:changed event on update', async (t) => {
        await withManager(t.name, async (manager) => {
            const serverConfig1 = MCPConfigManager.create('test', 'stdio', 'node');
            await manager.create(serverConfig1);

            // Watcher is automatically started in constructor
            let eventFired = false;

            manager.on('config:changed', () => {
                eventFired = true;
            });

            // Update the existing server
            await manager.update('test', { command: 'bun' });

            // Wait for file watcher to detect the change
            await sleep(2);

            ok(eventFired);
        });
    });

    test('emits config:changed event on removeServer', async (t) => {
        await withManager(t.name, async (manager) => {
            const serverConfig = MCPConfigManager.create('test', 'stdio', 'node');
            await manager.create(serverConfig);

            // Watcher is automatically started in constructor
            let eventFired = false;

            manager.on('config:changed', () => {
                eventFired = true;
            });

            await manager.delete('test');

            // Wait for file watcher to detect the change
            await sleep(2);

            ok(eventFired);
        });
    });

    test('emits config:changed event on setServerEnabled', async (t) => {
        await withManager(t.name, async (manager) => {
            const serverConfig = MCPConfigManager.create('test', 'stdio', 'node', [], undefined, true);
            await manager.create(serverConfig);

            // Watcher is automatically started in constructor
            let eventFired = 0;
            manager.on('config:changed', () => {
                eventFired++;
            });

            await manager.update('test', { enabled: false });

            // Wait for file watcher to detect the change
            await sleep(20);
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
            await manager.create(serverConfig);

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
        await withManager(t.name, async (manager) => {
            // Create a new manager with watch=false using the same path
            const noWatchManager = new MCPConfigManager(manager.configPath, false);

            try {
                let eventFired = 0;
                noWatchManager.on('config:changed', () => {
                    eventFired++;
                });

                // Add a server
                const serverConfig = MCPConfigManager.create('test-server-nowatch', 'stdio', 'node');
                await noWatchManager.create(serverConfig);

                // Wait to ensure no events fire from file watching
                await sleep(2);

                // Verify no watch events fired (only the direct modification events count)
                // Since we're not watching, external file changes won't trigger events
                strictEqual(eventFired, 0, 'No config:changed events should fire when watch=false');

                // Verify the manager still works normally for direct operations
                const config = await noWatchManager.read();
                ok(config.mcpServers.has('test-server-nowatch'), 'Server should be added');
            } finally {
                noWatchManager.cleanup();
            }
        });
    });
});
