import fastifySwagger from '@fastify/swagger';
import type { FastifyInstance, FastifySchema } from 'fastify';
import { Env } from '../utils';

/**
 * Transform function to convert our Zod-like validator schemas to JSON Schema
 * This is required for @fastify/swagger to auto-generate OpenAPI documentation
 */
function transformSchema({ schema, url }: { schema: FastifySchema; url: string }): { schema: FastifySchema; url: string } {
    // If schema is empty or doesn't need transformation, return as-is
    if (!schema || Object.keys(schema as Record<string, unknown>).length === 0) {
        return { schema, url };
    }

    const transformed: Record<string, unknown> = {};

    // Transform each schema property (body, querystring, params, headers, response)
    for (const [key, value] of Object.entries(schema)) {
        if (key === 'response' && typeof value === 'object' && value !== null) {
            // Handle response schemas (status code -> schema mapping)
            const responses: Record<string, unknown> = {};
            for (const [statusCode, responseSchema] of Object.entries(value)) {
                if (responseSchema && typeof responseSchema === 'object' && 'defs' in responseSchema) {
                    // It's a validator schema with defs() method
                    try {
                        const validator = responseSchema as { defs: (props?: boolean) => unknown };
                        responses[statusCode] = validator.defs(false);
                    } catch (err) {
                        console.error(`Failed to convert response schema for ${statusCode} at ${url}:`, err);
                        responses[statusCode] = responseSchema;
                    }
                } else {
                    responses[statusCode] = responseSchema;
                }
            }
            transformed[key] = responses;
        } else if (value && typeof value === 'object' && 'defs' in value) {
            // It's a validator schema with defs() method
            try {
                const validator = value as { defs: (props?: boolean) => unknown };
                transformed[key] = validator.defs(false);
            } catch (err) {
                console.error(`Failed to convert ${key} schema at ${url}:`, err);
                transformed[key] = value;
            }
        } else {
            // Keep as-is (tags, summary, description, etc.)
            transformed[key] = value;
        }
    }

    return { schema: transformed as FastifySchema, url };
}

/**
 * Register Swagger documentation with auto-generated OpenAPI spec
 *
 * This uses @fastify/swagger to automatically generate OpenAPI documentation
 * from route schemas defined in hello.ts, config.ts, mcp.ts, etc.
 *
 * Swagger UI will be available at /api/v1/swagger (custom HTML with unpkg)
 * OpenAPI spec will be available at /api/v1/openapi.json (auto-generated)
 */
export async function registerSwagger(app: FastifyInstance) {
    // Convert 0.0.0.0 to localhost for browser compatibility
    const host = process.env.HOST === '0.0.0.0' ? 'localhost' : (process.env.HOST ?? 'localhost');

    // Register Swagger plugin for auto-generating OpenAPI spec from route schemas
    await app.register(fastifySwagger, {
        openapi: {
            openapi: '3.0.0',
            info: {
                title: Env.appName,
                description: 'API documentation',
                version: Env.appVersion,
            },
            servers: [
                {
                    url: `http://${host}:${process.env.PORT ?? 3000}`,
                    description: 'Local development server',
                },
            ],
            tags: [
                {
                    name: 'Monitoring',
                    description: 'Monitoring and health check endpoints',
                },
                {
                    name: 'API Example',
                    description: 'A "hello world" example: Localize a number.',
                },
                {
                    name: 'MCP',
                    description: 'Model Context Protocol (MCP) JSON-RPC endpoints',
                },
                {
                    name: 'MCP Configuration',
                    description: 'CRUD operations for MCP server configurations',
                },
            ],
        },
        transform: transformSchema,
    });

    // Expose OpenAPI JSON at /api/v1/openapi.json (alias for auto-generated spec)
    app.get(
        '/api/v1/openapi.json',
        {
            schema: { hide: true },
        },
        async () => {
            return app.swagger();
        },
    );

    // Serve custom Swagger UI HTML with unpkg CDN
    app.get(
        '/api/v1/swagger',
        {
            schema: { hide: true },
        },
        async (_request, reply) => {
            // reply.type('text/html').send(SWAGGER_PAGE_HTML);
            reply.type('text/html').send(SCALAR_PAGE_HTML);
        },
    );

    console.log('Swagger UI registered at /api/v1/swagger');
    console.log('OpenAPI spec available at /api/v1/openapi.json (auto-generated from route schemas)');
}

/*** Swagger UI HTML is not in use ***

const _SWAGGER_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${Env.appName} API Documentation">
    <title>${Env.appName} - API Documentation</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css">
    <link rel="stylesheet" href="/theme.css">
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js" crossorigin></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js" crossorigin></script>
    <script>
        window.onload = () => {
            window.ui = SwaggerUIBundle({
                url: '/api/v1/openapi.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: 'StandaloneLayout',
                queryConfigEnabled: true,
                validatorUrl: 'https://validator.swagger.io/validator',
                displayRequestDuration: true,
                requestInterceptor: (req) => {
                    // Ensure proper headers for same-origin requests
                    if (!req.headers['Content-Type']) {
                        req.headers['Content-Type'] = 'application/json';
                    }
                    return req;
                },
            });
        };
    </script>
</body>
</html>`;
******************/

const SCALAR_PAGE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${Env.appName} - API Reference</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
</head>
<body>
  <script
    id="api-reference"
    data-url="/api/v1/openapi.json"
    data-configuration='{"showSidebar":true,"hideModels":true}'></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.39.3"></script>
</body>
</html>
`;
