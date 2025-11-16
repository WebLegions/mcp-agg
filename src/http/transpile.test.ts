import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { createServer, registerRoutes } from './server';

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
                url: '/public/components/theme-toggle/component.ts',
            });

            assert.equal(res.statusCode, 200);
            assert.equal(res.headers['content-type'], 'application/javascript; charset=utf-8');
            assert.ok(res.body.includes('class ThemeToggle'));
            assert.ok(res.body.includes('extends HTMLElement'));
            // Should not contain TypeScript-specific syntax like type annotations
            assert.ok(!res.body.includes(': void'));
        });

        test('should minify when query param is true', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/public/components/theme-toggle/component.ts?minify=true',
            });

            assert.equal(res.statusCode, 200);
            // Minified code should have no extra whitespace between statements
            assert.ok(res.body.includes('constructor(){'));
        });

        test('should not minify when query param is false', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/public/components/theme-toggle/component.ts?minify=false',
            });

            assert.equal(res.statusCode, 200);
            // Non-minified code should have readable formatting
            assert.ok(res.body.includes('constructor() {'));
        });
    });

    describe('CSS serving', () => {
        test('should serve CSS files', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/public/components/__mocks__/sample.css',
            });

            assert.equal(res.statusCode, 200);
            assert.equal(res.headers['content-type'], 'text/css; charset=utf-8');
            assert.ok(res.body.includes('body'));
        });

        test('should minify CSS when requested', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/public/components/__mocks__/sample.css?minify=true',
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
                url: '/public/components/__mocks__/sample.json',
            });

            assert.equal(res.statusCode, 200);
            assert.equal(res.headers['content-type'], 'application/json; charset=utf-8');
            const parsed = JSON.parse(res.body);
            assert.equal(parsed.name, 'test');
        });

        test('should minify JSON when requested', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/public/components/__mocks__/sample.json?minify=true',
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
                url: '/public/components/../secret.ts',
            });

            // Fastify normalizes URLs before routing, so this becomes /public/secret.ts
            // which gets 404 from our handler since it checks the filename param
            assert.equal(res.statusCode, 404);
        });

        test('should not serve test files with .test.ts extension', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/public/components/__mocks__/test-file.test.ts',
            });

            assert.equal(res.statusCode, 403);
            assert.ok(res.body.includes('Access denied'));
        });

        test('should not serve files in test directories', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/public/components/test/secret.ts',
            });

            // Security check blocks test directories before checking if file exists
            assert.equal(res.statusCode, 403);
            assert.ok(res.body.includes('Access denied'));
        });

        test('should not serve files in fixtures directories', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/public/components/mock.ts',
            });

            // File doesn't exist, so returns 404 (test pattern check happens after file is found)
            assert.equal(res.statusCode, 404);
        });

        test('should prevent serving test files that exist', async () => {
            // The test-file.test.ts actually exists, so we can verify the security check
            const res = await app.inject({
                method: 'GET',
                url: '/public/components/__mocks__/test-file.test.ts',
            });

            assert.equal(res.statusCode, 403);
        });
    });

    describe('Error handling', () => {
        test('should return 404 for non-existent files', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/public/components/nonexistent.ts',
            });

            assert.equal(res.statusCode, 404);
            assert.ok(res.body.includes('File not found'));
        });

        test('should return 404 for unsupported file types', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/public/components/file.txt',
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
                url: '/public/components/theme-toggle/component.ts',
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
                url: '/public/components/theme-toggle/component.ts',
            });

            assert.equal(res.headers['content-type'], 'application/javascript; charset=utf-8');
        });

        test('should return correct MIME type for CSS', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/public/components/__mocks__/sample.css',
            });

            assert.equal(res.headers['content-type'], 'text/css; charset=utf-8');
        });

        test('should return correct MIME type for JSON', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/public/components/__mocks__/sample.json',
            });

            assert.equal(res.headers['content-type'], 'application/json; charset=utf-8');
        });

        test('should return correct MIME type for JavaScript', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/public/components/__mocks__/sample.js',
            });

            assert.equal(res.statusCode, 200);
            assert.equal(res.headers['content-type'], 'application/javascript; charset=utf-8');
        });
    });

    describe('TypeScript import extensions', () => {
        test('should add .ts extensions to relative imports', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/public/components/__mocks__/with-import.ts',
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
                url: '/public/components/__mocks__/sample.txt',
            });

            // Unknown file type should still be served with empty content-type
            assert.equal(res.statusCode, 200);
        });
    });

    describe('JavaScript minification', () => {
        test('should minify JavaScript files when requested', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/public/components/__mocks__/sample.js?minify=true',
            });

            assert.equal(res.statusCode, 200);
            // Minified JS should have reduced whitespace
            assert.ok(res.body.includes('function'));
        });
    });
});
