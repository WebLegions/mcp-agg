import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { number, object, string } from '../shared/libs/validator';
import { createServer } from './server';

/**
 * Type Provider Integration Tests
 *
 * These tests validate the Fastify type provider (schemaCompiler)
 * by testing through Fastify's HTTP layer using inject() rather than calling the compiler
 * functions directly.
 *
 * Why indirect testing?
 * - schemaCompiler returns FastifySchemaCompiler type which is a union of boolean | Promise | ValidationResult
 * - Direct calls would require type casting and wouldn't test the actual integration with Fastify
 * - Testing via inject() validates the complete request/response validation pipeline
 *
 * Each test creates a fresh Fastify instance with a test route that uses schema validation,
 * then makes HTTP requests to verify validation behavior via status codes:
 * - 200: successful validation and response
 * - 400: validation error (invalid schema)
 * - 404: route not found
 */

describe('Validator Provider', () => {
    // Body validation tests
    test('should validate string with min/max constraints', async () => {
        const app = await createServer();

        app.post('/test', {
            schema: {
                body: string().min(3).max(10),
            },
            handler: async (request, reply) => {
                return reply.send({ value: request.body });
            },
        });

        // Valid input
        const response1 = await app.inject({
            method: 'POST',
            url: '/test',
            payload: JSON.stringify('hello'),
            headers: { 'content-type': 'application/json' },
        });
        strictEqual(response1.statusCode, 200);
        deepEqual(response1.json(), { value: 'hello' });

        // Invalid input - too short
        const response2 = await app.inject({
            method: 'POST',
            url: '/test',
            payload: JSON.stringify('hi'),
            headers: { 'content-type': 'application/json' },
        });
        strictEqual(response2.statusCode, 400);
    });

    test('should validate object schema with required fields', async () => {
        const app = await createServer();

        app.post('/test', {
            schema: {
                body: {
                    name: string().min(2),
                    age: number().int().min(0),
                },
            },
            handler: async (request, reply) => {
                return reply.send({ value: request.body });
            },
        });

        // Valid input
        const response1 = await app.inject({
            method: 'POST',
            url: '/test',
            payload: { name: 'John', age: 30 },
        });
        strictEqual(response1.statusCode, 200);
        deepEqual(response1.json(), { value: { name: 'John', age: 30 } });

        // Invalid input - missing required field
        const response2 = await app.inject({
            method: 'POST',
            url: '/test',
            payload: { name: 'John' },
        });
        strictEqual(response2.statusCode, 400);
        ok(response2.body.includes('age'));

        // Invalid input - age not integer
        const response3 = await app.inject({
            method: 'POST',
            url: '/test',
            payload: { name: 'John', age: 30.5 },
        });
        strictEqual(response3.statusCode, 400);
    });

    test('should validate nested object schemas', async () => {
        const app = await createServer();

        app.post('/test', {
            schema: {
                body: {
                    user: object({
                        name: string(),
                        email: string().email(),
                    }),
                },
            },
            handler: async (request, reply) => {
                return reply.send({ value: request.body });
            },
        });

        // Valid input
        const response1 = await app.inject({
            method: 'POST',
            url: '/test',
            payload: { user: { name: 'John', email: 'john@example.com' } },
        });
        strictEqual(response1.statusCode, 200);
        deepEqual(response1.json(), { value: { user: { name: 'John', email: 'john@example.com' } } });

        // Invalid input - invalid email
        const response2 = await app.inject({
            method: 'POST',
            url: '/test',
            payload: { user: { name: 'John', email: 'not-an-email' } },
        });
        strictEqual(response2.statusCode, 400);
    });

    // Querystring validation tests
    test('should validate querystring parameters', async () => {
        const app = await createServer();

        app.get('/test', {
            schema: {
                querystring: {
                    id: string().min(1),
                    count: number().int().min(0).optional(),
                },
            },
            handler: async (request, reply) => {
                return reply.send({ query: request.query });
            },
        });

        // Valid input
        const response1 = await app.inject({
            method: 'GET',
            url: '/test?id=123&count=5',
        });
        strictEqual(response1.statusCode, 200);

        // Invalid input - missing required field
        const response2 = await app.inject({
            method: 'GET',
            url: '/test?count=5',
        });
        strictEqual(response2.statusCode, 400);
    });

    // Params validation tests
    test('should validate URL params', async () => {
        const app = await createServer();

        app.get('/test/:id', {
            schema: {
                params: {
                    id: string().min(1),
                },
            },
            handler: async (request, reply) => {
                return reply.send({ params: request.params });
            },
        });

        // Valid input
        const response1 = await app.inject({
            method: 'GET',
            url: '/test/123',
        });
        strictEqual(response1.statusCode, 200);

        // Invalid input - empty param fails validation with 400
        const response2 = await app.inject({
            method: 'GET',
            url: '/test/',
        });
        strictEqual(response2.statusCode, 400);
    });

    test('should return error for invalid numeric data', async () => {
        const app = await createServer();

        app.post('/test', {
            schema: {
                body: number().min(10),
            },
            handler: async (request, reply) => {
                return reply.send({ value: request.body });
            },
        });

        const response = await app.inject({
            method: 'POST',
            url: '/test',
            payload: JSON.stringify(5),
            headers: { 'content-type': 'application/json' },
        });
        strictEqual(response.statusCode, 400);
    });

    test('should handle empty object schemas', async () => {
        const app = await createServer();

        app.post('/test', {
            schema: {
                body: {},
            },
            handler: async (request, reply) => {
                return reply.send({ value: request.body });
            },
        });

        const response = await app.inject({
            method: 'POST',
            url: '/test',
            payload: {},
        });
        strictEqual(response.statusCode, 200);
        deepEqual(response.json(), { value: {} });
    });

    // Response serialization tests
    test('should serialize response data correctly', async () => {
        const app = await createServer();

        app.get('/test', {
            schema: {
                response: {
                    200: {
                        name: string(),
                        age: number(),
                    },
                },
            },
            handler: async (_request, reply) => {
                return reply.send({ name: 'John', age: 30, extra: 'ignored' });
            },
        });

        const response = await app.inject({
            method: 'GET',
            url: '/test',
        });
        strictEqual(response.statusCode, 200);
        // Serializer should return all fields (no filtering in our implementation)
        const body = response.json();
        strictEqual(body.name, 'John');
        strictEqual(body.age, 30);
    });

    test('should serialize nested objects in responses', async () => {
        const app = await createServer();

        app.get('/test', {
            schema: {
                response: {
                    200: {
                        user: object({
                            name: string(),
                            age: number(),
                        }),
                    },
                },
            },
            handler: async (_request, reply) => {
                return reply.send({ user: { name: 'John', age: 30 } });
            },
        });

        const response = await app.inject({
            method: 'GET',
            url: '/test',
        });
        strictEqual(response.statusCode, 200);
        deepEqual(response.json(), { user: { name: 'John', age: 30 } });
    });
});
