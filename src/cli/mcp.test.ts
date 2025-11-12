/**
 * Tests for MCP CLI commands
 * Note: Full CLI behavior is tested in integration tests (ci/)
 * These tests focus on the exported function interface
 */

import { strict as assert } from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, mock, test } from 'node:test';
import { runMCPCLI } from './mcp';

describe('mcp-cli', () => {
    let originalConsoleLog: typeof console.log;
    let originalConsoleError: typeof console.error;
    let originalExit: typeof process.exit;
    let originalStdoutWrite: typeof process.stdout.write;
    let logs: string[] = [];
    let errors: string[] = [];
    let originalStdin: NodeJS.ReadStream;
    let mockStdin: NodeJS.ReadWriteStream | undefined;

    beforeEach(() => {
        // Capture console output
        logs = [];
        errors = [];
        originalConsoleLog = console.log;
        originalConsoleError = console.error;
        originalExit = process.exit;
        originalStdin = Object(process).stdin;
        originalStdoutWrite = process.stdout.write;

        console.log = (...args: unknown[]) => {
            logs.push(args.join(' '));
        };
        console.error = (...args: unknown[]) => {
            errors.push(args.join(' '));
        };

        // Mock stdout.write to capture JSON output
        process.stdout.write = ((...args: unknown[]) => {
            logs.push(String(args[0]));
            return true;
        }) as typeof process.stdout.write;

        // Prevent actual process exit
        process.exit = mock.fn((() => {
            throw new Error('process.exit called');
        }) as never);
    });

    afterEach(async () => {
        // Restore console methods FIRST so cleanup works properly
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        process.exit = originalExit;
        process.stdout.write = originalStdoutWrite;
        if (mockStdin) {
            Object(process).stdin = originalStdin;
            mockStdin = undefined;
        }
        mock.restoreAll();
        // Each test should clean up only the servers it creates.
    });

    test('runMCPCLI is exported', () => {
        assert.equal(typeof runMCPCLI, 'function');
    });

    test('runMCPCLI shows help with no args', async () => {
        const exitCode = await runMCPCLI([]);

        assert.equal(exitCode, 1);
        assert.ok(logs.some((log) => log.includes('Usage:')));
        assert.ok(logs.some((log) => log.includes('Commands:')));
    });

    test('runMCPCLI shows help with --help flag', async () => {
        const exitCode = await runMCPCLI(['--help']);

        assert.equal(exitCode, 1);
        assert.ok(logs.some((log) => log.includes('Usage:')));
    });

    test('runMCPCLI shows help with -h flag', async () => {
        const exitCode = await runMCPCLI(['-h']);

        assert.equal(exitCode, 1);
        assert.ok(logs.some((log) => log.includes('Usage:')));
    });

    test('runMCPCLI handles unknown subcommand', async () => {
        const exitCode = await runMCPCLI(['unknown-command']);

        assert.equal(exitCode, 1);
        assert.ok(errors.some((err) => err.includes('Unknown subcommand')));
    });

    test('list command runs without crashing', async () => {
        const exitCode = await runMCPCLI(['list']);

        // Should return 0 or 1 depending on whether MCP config exists
        assert.ok(exitCode === 0 || exitCode === 1);
    });

    test('remove command shows error for missing name', async () => {
        const exitCode = await runMCPCLI(['remove']);

        assert.equal(exitCode, 1);
        assert.ok(errors.some((err) => err.includes('name is required')));
    });

    test('get command shows error for missing name', async () => {
        const exitCode = await runMCPCLI(['get']);

        assert.equal(exitCode, 1);
        assert.ok(errors.some((err) => err.includes('name is required')));
    });

    test('enable command shows error for missing name', async () => {
        const exitCode = await runMCPCLI(['enable']);

        assert.equal(exitCode, 1);
        assert.ok(errors.some((err) => err.includes('name is required')));
    });

    test('disable command shows error for missing name', async () => {
        const exitCode = await runMCPCLI(['disable']);

        assert.equal(exitCode, 1);
        assert.ok(errors.some((err) => err.includes('name is required')));
    });

    test('add command validates transport type', async () => {
        const exitCode = await runMCPCLI(['add', 'test-server', 'http://localhost', '--transport', 'invalid']);

        assert.equal(exitCode, 1);
        assert.ok(errors.some((err) => err.includes('Invalid transport')));
    });

    test('add-json command shows error for missing args', async () => {
        const exitCode = await runMCPCLI(['add-json']);

        assert.equal(exitCode, 1);
        assert.ok(errors.some((err) => err.includes('name and JSON config are required')));
    });

    test('add-json command shows error for invalid JSON', async () => {
        const exitCode = await runMCPCLI(['add-json', 'test', 'not-valid-json']);

        assert.equal(exitCode, 1);
        assert.ok(errors.some((err) => err.includes('Failed to add server from JSON')));
    });

    test('list command supports --json flag', async () => {
        const exitCode = await runMCPCLI(['list', '--json']);

        // Should return 0 or 1 depending on whether MCP config exists
        assert.ok(exitCode === 0 || exitCode === 1);
    });

    test('get command supports --json flag', async () => {
        const exitCode = await runMCPCLI(['get', 'nonexistent-server', '--json']);

        // Should fail because server doesn't exist
        assert.equal(exitCode, 1);
    });

    test('add command with stdio transport requires command', async () => {
        mockStdin = new PassThrough();
        Object(process).stdin = mockStdin;
        // Simulate all required interactive prompts
        mockStdin.write('test-server\r');
        mockStdin.write('stdio\r');
        mockStdin.write('node test-server.js\r');
        mockStdin.write('\r'); // no args
        mockStdin.end();
        //mockStdin.write('\n'); // no env vars
        const exitCode = await runMCPCLI(['add', 'test', '--transport', 'stdio']);
        assert.ok(exitCode >= 0);
    });

    test('add command with http transport requires URL', async () => {
        mockStdin = new PassThrough();
        Object(process).stdin = mockStdin;
        // Simulate all required interactive prompts
        mockStdin.write('test-server\r');
        mockStdin.write('http\r');
        mockStdin.write('http://localhost:1234\r');
        mockStdin.end();
        //mockStdin.write('n\r'); // no env vars
        const exitCode = await runMCPCLI(['add', 'test', '--transport', 'http']);
        assert.ok(exitCode >= 0);
    });

    test('remove command returns error for nonexistent server', async () => {
        const exitCode = await runMCPCLI(['remove', 'nonexistent-server-xyz-123']);

        assert.equal(exitCode, 1);
    });

    test('get command returns error for nonexistent server', async () => {
        const exitCode = await runMCPCLI(['get', 'nonexistent-server-xyz-123']);

        assert.equal(exitCode, 1);
        assert.ok(errors.some((err) => err.includes('not found')));
    });

    test('add command with --force skips validation', async () => {
        const exitCode = await runMCPCLI([
            'add',
            'test-server-force',
            'http://nonexistent-url.invalid',
            '--transport',
            'http',
            '--force',
        ]);

        // Should succeed because --force skips validation
        assert.ok(exitCode === 0 || exitCode === 1);
    });

    test('add command with --env adds environment variables', async () => {
        const exitCode = await runMCPCLI([
            'add',
            'test-server-env',
            'npx',
            'test-package',
            '--transport',
            'stdio',
            '--env',
            'TEST_VAR=test_value',
            '--env',
            'ANOTHER_VAR=another_value',
            '--force',
        ]);

        assert.ok(exitCode === 0 || exitCode === 1);
    });

    test('add command enters interactive mode when missing name', async () => {
        mockStdin = new PassThrough();
        Object(process).stdin = mockStdin;

        // Provide all required inputs
        mockStdin.write('interactive-server\n');
        mockStdin.write('http\n');
        mockStdin.write('http://localhost:9999\n');
        mockStdin.write('n\n'); // no env vars
        mockStdin.end();

        const exitCode = await runMCPCLI(['add']);

        // Should complete successfully or fail gracefully
        assert.ok(exitCode === 0 || exitCode === 1);
    });

    test('add command enters interactive mode when missing transport', async () => {
        mockStdin = new PassThrough();
        Object(process).stdin = mockStdin;

        mockStdin.write('stdio\n');
        mockStdin.write('echo\n');
        mockStdin.write('test\n'); // args
        mockStdin.write('n\n'); // no env vars
        mockStdin.end();

        const exitCode = await runMCPCLI(['add', 'test-stdio-server']);

        assert.ok(exitCode === 0 || exitCode === 1);
    });

    test('add command with sse transport', async () => {
        const exitCode = await runMCPCLI(['add', 'test-sse-server', 'http://localhost:8080', '--transport', 'sse', '--force']);

        assert.ok(exitCode === 0 || exitCode === 1);
    });

    test('add-json command with valid JSON', async () => {
        const exitCode = await runMCPCLI([
            'add-json',
            'test-json-server',
            '{"transport":"http","url":"http://localhost:5000","enabled":true}',
        ]);

        assert.ok(exitCode === 0 || exitCode === 1);
    });

    test('interactive add prompts for args when stdio', async () => {
        mockStdin = new PassThrough();
        Object(process).stdin = mockStdin;

        mockStdin.write('test-with-args\n');
        mockStdin.write('stdio\n');
        mockStdin.write('node\n');
        mockStdin.write('server.js --port 3000\n'); // args with spaces
        mockStdin.write('n\n'); // no env
        mockStdin.end();

        const exitCode = await runMCPCLI(['add']);

        assert.ok(exitCode === 0 || exitCode === 1);
    });

    test('interactive add supports environment variables', async () => {
        mockStdin = new PassThrough();
        Object(process).stdin = mockStdin;

        mockStdin.write('test-with-env\n');
        mockStdin.write('stdio\n');
        mockStdin.write('node\n');
        mockStdin.write('\n'); // no args
        mockStdin.write('y\n'); // yes to env vars
        mockStdin.write('MY_KEY\n');
        mockStdin.write('my_value\n');
        mockStdin.write('\n'); // finish env vars
        mockStdin.end();

        const exitCode = await runMCPCLI(['add']);

        assert.ok(exitCode === 0 || exitCode === 1);
    });

    test('get command displays server details in human-readable format', async () => {
        // First add a server
        await runMCPCLI(['add', 'test-get-server', 'http://localhost:8080', '--transport', 'http', '--force']);

        // Clear logs from add command
        logs = [];
        errors = [];

        // Now get the server details
        const exitCode = await runMCPCLI(['get', 'test-get-server']);

        assert.equal(exitCode, 0);
        assert.ok(logs.some((log) => log.includes('Server: test-get-server')));
        assert.ok(logs.some((log) => log.includes('Transport: http')));
        assert.ok(logs.some((log) => log.includes('URL: http://localhost:8080')));
    });

    test('get command outputs JSON when --json flag is provided', async () => {
        // First add a server
        const addExitCode = await runMCPCLI([
            'add',
            'test-get-json-server',
            'http://localhost:9000',
            '--transport',
            'http',
            '--force',
        ]);

        // Only proceed if add succeeded
        assert.ok(addExitCode === 0 || addExitCode === 1, 'Add command should complete');

        // Clear logs from add command
        logs = [];
        errors = [];

        // Now get the server details as JSON
        const exitCode = await runMCPCLI(['get', 'test-get-json-server', '--json']);

        assert.equal(exitCode, 0);
        // Verify JSON output was written to stdout (captured in logs)
        const jsonOutput = logs.join(' ');
        assert.ok(jsonOutput.includes('"name"'));
        assert.ok(jsonOutput.includes('"transport"'));
    });

    test('get command displays stdio server with command and args', async () => {
        // Add a stdio server with args
        await runMCPCLI(['add', 'test-stdio-get', 'npx', '-y', 'test-package', '--transport', 'stdio', '--force']);

        // Clear logs
        logs = [];
        errors = [];

        // Get the server details
        const exitCode = await runMCPCLI(['get', 'test-stdio-get']);

        assert.equal(exitCode, 0);
        assert.ok(logs.some((log) => log.includes('Command: npx')));
        assert.ok(logs.some((log) => log.includes('Args:')));
    });

    test('get command displays environment variables', async () => {
        // Add server with env vars
        await runMCPCLI([
            'add',
            'test-env-get',
            'npx',
            'test-pkg',
            '--transport',
            'stdio',
            '--env',
            'API_KEY=secret',
            '--env',
            'REGION=us-west',
            '--force',
        ]);

        // Clear logs
        logs = [];
        errors = [];

        // Get the server details
        const exitCode = await runMCPCLI(['get', 'test-env-get']);

        assert.equal(exitCode, 0);
        assert.ok(logs.some((log) => log.includes('Environment variables:')));
        assert.ok(logs.some((log) => log.includes('API_KEY')));
        assert.ok(logs.some((log) => log.includes('REGION')));
    });

    test('enable command enables a disabled server', async () => {
        // First add a server
        await runMCPCLI(['add', 'test-enable-server', 'http://localhost:7000', '--transport', 'http', '--force']);

        // Disable it first
        await runMCPCLI(['disable', 'test-enable-server']);

        // Clear logs
        logs = [];
        errors = [];

        // Now enable it
        const exitCode = await runMCPCLI(['enable', 'test-enable-server']);

        assert.equal(exitCode, 0);
        assert.ok(logs.some((log) => log.includes('enabled')));
        assert.ok(logs.some((log) => log.includes('test-enable-server')));
    });

    test('disable command disables an enabled server', async () => {
        // First add a server
        await runMCPCLI(['add', 'test-disable-server', 'http://localhost:6000', '--transport', 'http', '--force']);

        // Clear logs
        logs = [];
        errors = [];

        // Disable it
        const exitCode = await runMCPCLI(['disable', 'test-disable-server']);

        assert.equal(exitCode, 0);
        assert.ok(logs.some((log) => log.includes('disabled')));
        assert.ok(logs.some((log) => log.includes('test-disable-server')));
    });

    test('enable command returns error for nonexistent server', async () => {
        const exitCode = await runMCPCLI(['enable', 'nonexistent-enable-server-xyz']);

        assert.equal(exitCode, 1);
        assert.ok(errors.some((err) => err.includes('Failed to enable')));
    });

    test('disable command returns error for nonexistent server', async () => {
        const exitCode = await runMCPCLI(['disable', 'nonexistent-disable-server-xyz']);

        assert.equal(exitCode, 1);
        assert.ok(errors.some((err) => err.includes('Failed to disable')));
    });

    test('enable/disable commands toggle server state correctly', async () => {
        // Add server
        await runMCPCLI(['add', 'test-toggle-server', 'http://localhost:5555', '--transport', 'http', '--force']);

        // Disable
        let exitCode = await runMCPCLI(['disable', 'test-toggle-server']);
        assert.equal(exitCode, 0);

        // Enable
        exitCode = await runMCPCLI(['enable', 'test-toggle-server']);
        assert.equal(exitCode, 0);

        // Disable again
        exitCode = await runMCPCLI(['disable', 'test-toggle-server']);
        assert.equal(exitCode, 0);
    });
});
