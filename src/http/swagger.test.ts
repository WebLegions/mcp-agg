import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createServer, registerRoutes } from './server';

describe('Swagger documentation', () => {
    test('GET /api/v1/openapi.json returns OpenAPI spec', async () => {
        const app = await createServer();
        await registerRoutes(app);

        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/openapi.json',
        });

        if (response.statusCode !== 200) {
            console.error('OpenAPI endpoint error:', response.statusCode, response.body);
        }
        assert.equal(response.statusCode, 200);
        const body = JSON.parse(response.body);
        assert.equal(body.openapi, '3.0.0');
        assert.ok(body.info);
        assert.ok(body.info.title);
        assert.ok(body.info.version);
    });

    test('GET /api/v1/openapi.json includes registered paths', async () => {
        const app = await createServer();
        await registerRoutes(app);

        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/openapi.json',
        });

        assert.equal(response.statusCode, 200);
        const body = JSON.parse(response.body);
        assert.ok(body.paths);
        assert.ok(typeof body.paths === 'object');
        // Should have at least the health endpoint
        assert.ok(Object.keys(body.paths).length > 0);
    });

    test('GET /api/v1/swagger returns Scalar API Reference HTML', async () => {
        const app = await createServer();
        await registerRoutes(app);

        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/swagger',
        });

        assert.equal(response.statusCode, 200);
        assert.match(response.headers['content-type'] || '', /text\/html/);
        assert.match(response.body, /api-reference/i);
    });

    test('OpenAPI spec has correct structure', async () => {
        const app = await createServer();
        await registerRoutes(app);

        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/openapi.json',
        });

        const spec = JSON.parse(response.body);

        // Verify required OpenAPI fields
        assert.ok(spec.openapi);
        assert.ok(spec.info);
        assert.ok(spec.info.title);
        assert.ok(spec.info.version);
        assert.ok(spec.servers);
        assert.ok(Array.isArray(spec.servers));
        assert.ok(spec.paths);
        assert.ok(typeof spec.paths === 'object');
    });

    test('OpenAPI spec includes application routes', async () => {
        const app = await createServer();
        await registerRoutes(app);

        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/openapi.json',
        });

        const spec = JSON.parse(response.body);
        const pathKeys = Object.keys(spec.paths);

        // Should include application routes like /health and /api/v1/hello
        assert.ok(pathKeys.includes('/health'));
        assert.ok(pathKeys.includes('/api/v1/hello'));
        // Note: With @fastify/swagger, swagger/openapi routes ARE included in the spec
        // This is expected behavior - they're documented endpoints too
    });
});
