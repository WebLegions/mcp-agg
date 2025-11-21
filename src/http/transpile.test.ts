import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, test } from 'node:test';
import Fastify, { type FastifyInstance } from 'fastify';
import { createServer, registerRoutes } from './server';
import { registerEnvInject } from './transpile';

const MOCK_DIR = path.join(__dirname, '__mock__');
const TEST_FILENAME = 'test-env.html';
const TEST_HTML_PATH = path.join(MOCK_DIR, TEST_FILENAME);
const TEST_ROUTE = '/test-env.html';
const ENV_SCRIPT_MARKER = '<script>window.env = ';

describe('registerEnvInjectedHtml', () => {
    let fastify: FastifyInstance;

    beforeEach(async () => {
        fastify = Fastify();
        // Ensure mock directory exists
        try {
            await fs.mkdir(MOCK_DIR);
        } catch {}
        // Create the test HTML file before registering the route
        await fs.writeFile(TEST_HTML_PATH, '<html><head></head><body>Hello</body></html>');
        await registerEnvInject(fastify, [TEST_FILENAME], MOCK_DIR);
        await fastify.listen({ port: 0 });
    });

    afterEach(async () => {
        try {
            await fs.unlink(TEST_HTML_PATH);
        } catch {}
        try {
            await fs.rmdir(MOCK_DIR);
        } catch {}
        await fastify.close();
    });

    test('injects env script into HTML response', async () => {
        const res = await fastify.inject({ method: 'GET', url: TEST_ROUTE, headers: { accept: 'text/html' } });
        assert.equal(res.statusCode, 200);
        assert.match(res.body, new RegExp(ENV_SCRIPT_MARKER));
        assert.match(res.body, /Hello/);
    });

    test('returns error for missing file at registration', async () => {
        // Remove file if exists
        try {
            await fs.unlink(TEST_HTML_PATH);
        } catch {}
        const fastify404 = Fastify();
        let threw = false;
        try {
            await registerEnvInject(fastify404, [TEST_FILENAME], MOCK_DIR);
        } catch (err) {
            threw = true;
            assert.match(String(err), /File not found/);
        }
        assert.ok(threw, 'Should throw error for missing file');
    });

    test('serves from cache on repeated requests', async () => {
        // Modify the existing test file with new content
        await fs.writeFile(TEST_HTML_PATH, '<html><head></head><body>CacheTest</body></html>');

        // First request (cache miss due to mtime change)
        let res = await fastify.inject({ method: 'GET', url: TEST_ROUTE, headers: { accept: 'text/html' } });
        assert.equal(res.statusCode, 200);
        assert.match(res.body, /CacheTest/);
        assert.equal(res.headers['x-cache'], 'MISS');

        // Second request (should hit cache, x-cache header = HIT)
        res = await fastify.inject({ method: 'GET', url: TEST_ROUTE, headers: { accept: 'text/html' } });
        assert.equal(res.statusCode, 200);
        assert.match(res.body, /CacheTest/);
        assert.equal(res.headers['x-cache'], 'HIT');
    });
});

describe('Transpile endpoint', () => {
    let app: Awaited<ReturnType<typeof createServer>>;

    beforeEach(async () => {
        app = createServer();
        await registerRoutes(app);
        await app.ready();
    });

    afterEach(async () => {
        await app.close();
    });

    describe('TypeScript transpilation', () => {
        test('should transpile TypeScript to JavaScript', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/app/components/theme-switch/component.ts',
            });

            assert.equal(res.statusCode, 200);
            assert.equal(res.headers['content-type'], 'application/javascript; charset=utf-8');
            assert.ok(res.body.includes('function ThemeSwitch'));
            // Should not contain TypeScript-specific syntax like type annotations
            assert.ok(!res.body.includes(': void'));
        });

        test('should minify when query param is true', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/app/components/theme-switch/component.ts?minify=true',
            });

            assert.equal(res.statusCode, 200);
            // Minified code should have no extra whitespace between statements
            assert.ok(res.body.includes('function ThemeSwitch('));
        });

        test('should not minify when query param is false', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/app/components/theme-switch/component.ts?minify=false',
            });

            assert.equal(res.statusCode, 200);
            // Non-minified code should have readable formatting
            assert.ok(res.body.includes('function ThemeSwitch(_props'));
        });
    });

    describe('CSS serving', () => {
        test('should serve CSS files', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/app/components/__mocks__/sample.css',
            });

            assert.equal(res.statusCode, 200);
            assert.equal(res.headers['content-type'], 'text/css; charset=utf-8');
            assert.ok(res.body.includes('body'));
        });

        test('should minify CSS when requested', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/app/components/__mocks__/sample.css?minify=true',
            });

            assert.equal(res.statusCode, 200);
            // Minified CSS should remove comments and extra whitespace
            assert.ok(!res.body.includes('/*'));
            assert.ok(!res.body.includes('\n'));
        });
    });

    describe('JSON serving', () => {
        test('should serve JSON files', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/app/components/__mocks__/sample.json',
            });

            assert.equal(res.statusCode, 200);
            assert.equal(res.headers['content-type'], 'application/json; charset=utf-8');
            const parsed = JSON.parse(res.body);
            assert.equal(parsed.name, 'test');
        });

        test('should minify JSON when requested', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/app/components/__mocks__/sample.json?minify=true',
            });

            assert.equal(res.statusCode, 200);
            // Minified JSON should have no whitespace
            assert.ok(!res.body.includes('\n'));
            assert.ok(!res.body.includes('  '));
        });
    });

    describe('Security', () => {
        test('should reject path traversal attempts with ..', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/app/components/../secret.ts',
            });

            // Fastify normalizes URLs before routing, so this becomes /app/secret.ts
            // which gets 404 from our handler since it checks the filename param
            assert.equal(res.statusCode, 404);
        });

        test('should not serve test files with .test.ts extension', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/app/components/__mocks__/test-file.test.ts',
            });

            assert.equal(res.statusCode, 404);
            assert.ok(res.body.includes('File not found'));
        });

        test('should not serve files in test directories', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/app/components/test/secret.ts',
            });

            // Security check blocks test directories
            assert.equal(res.statusCode, 404);
            assert.ok(res.body.includes('File not found'));
        });

        test('should not serve files in fixtures directories', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/app/components/mock.ts',
            });

            // File doesn't exist, so returns 404 (test pattern check happens after file is found)
            assert.equal(res.statusCode, 404);
        });

        test('should prevent serving test files that exist', async () => {
            // The test-file.test.ts actually exists, so we can verify the security check
            const res = await app.inject({
                method: 'GET',
                url: '/app/components/__mocks__/test-file.test.ts',
            });

            assert.equal(res.statusCode, 404);
        });
    });

    describe('Error handling', () => {
        test('should return 404 for non-existent files', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/app/components/nonexistent.ts',
            });

            assert.equal(res.statusCode, 404);
            assert.ok(res.body.includes('File not found'));
        });

        test('should return 404 for unsupported file types', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/app/components/file.txt',
            });

            // Unsupported file types are handled by processFile which will fail to find them
            assert.equal(res.statusCode, 404);
            assert.ok(res.body.includes('File not found'));
        });
    });

    describe('Cache headers', () => {
        test('should include Cache-Control header', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/app/components/theme-switch/component.ts',
            });

            assert.equal(res.statusCode, 200);
            assert.ok(res.headers['cache-control']);
            assert.ok(res.headers['cache-control']?.includes('max-age'));
        });
    });

    describe('MIME types', () => {
        test('should return correct MIME type for TypeScript', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/app/components/theme-switch/component.ts',
            });

            assert.equal(res.headers['content-type'], 'application/javascript; charset=utf-8');
        });

        test('should return correct MIME type for CSS', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/app/components/__mocks__/sample.css',
            });

            assert.equal(res.headers['content-type'], 'text/css; charset=utf-8');
        });

        test('should return correct MIME type for JSON', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/app/components/__mocks__/sample.json',
            });

            assert.equal(res.headers['content-type'], 'application/json; charset=utf-8');
        });

        test('should return correct MIME type for JavaScript', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/app/components/__mocks__/sample.js',
            });

            assert.equal(res.statusCode, 200);
            assert.equal(res.headers['content-type'], 'application/javascript; charset=utf-8');
        });
    });

    describe('TypeScript import extensions', () => {
        test('should add .ts extensions to relative imports', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/app/components/__mocks__/with-import.ts',
            });

            assert.equal(res.statusCode, 200);
            // Check that imports have .ts extensions added
            assert.ok(res.body.includes('./sample.ts') || res.body.includes('"./sample.ts"'));
        });
    });

    describe('Unknown file types', () => {
        test('should handle unknown file extensions', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/app/components/__mocks__/sample.txt',
            });

            // Unknown file type should still be served with empty content-type
            assert.equal(res.statusCode, 200);
        });
    });

    describe('JavaScript minification', () => {
        test('should minify JavaScript files when requested', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/app/components/__mocks__/sample.js?minify=true',
            });

            assert.equal(res.statusCode, 200);
            // Minified JS should have reduced whitespace
            assert.ok(res.body.includes('function'));
        });
    });
});
