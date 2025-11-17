import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { createServer, registerRoutes } from './server';

describe('Error Handler', () => {
    let app: FastifyInstance;

    beforeEach(async () => {
        app = createServer();
        await registerRoutes(app);
    });

    afterEach(async () => {
        await app.close();
    });

    test('should return HTML error page for 404 on text request', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/nonexistent-page',
            headers: {
                accept: 'text/html',
            },
        });

        assert.equal(res.statusCode, 404);
        assert.ok(res.headers['content-type']?.includes('text/html'));
        assert.ok(res.body.includes('404'));
        assert.ok(res.body.includes('Not Found'));
        assert.ok(res.body.includes('Go to Homepage'));
    });

    test('should return JSON error for 404 on non-text request', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/api/v1/nonexistent',
        });

        assert.equal(res.statusCode, 404);
        assert.ok(res.headers['content-type']?.includes('application/json'));
        const body = JSON.parse(res.body);
        assert.equal(body.statusCode, 404);
        assert.equal(body.error, 'Not Found');
    });

    test('should return HTML error page for 404 when Accept includes text/html with wildcards', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/nonexistent-page',
            headers: {
                accept: 'image/avif,image/webp,image/png,image/svg+xml,image/*;q=0.8,*/*;q=0.5',
            },
        });

        assert.equal(res.statusCode, 404);
        assert.ok(res.headers['content-type']?.includes('application/json'));
        const body = JSON.parse(res.body);
        assert.equal(body.statusCode, 404);
        assert.equal(body.error, 'Not Found');
    });

    test('should return JSON for 404 when no Accept header provided', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/nonexistent-file',
        });

        assert.equal(res.statusCode, 404);
        assert.ok(res.headers['content-type']?.includes('application/json'));
        const body = JSON.parse(res.body);
        assert.equal(body.statusCode, 404);
        assert.equal(body.error, 'Not Found');
    });
});
