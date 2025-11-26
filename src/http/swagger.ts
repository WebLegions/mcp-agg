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

    app.get(
        '/api/v1/swagger',
        {
            schema: { hide: true },
        },
        async (_request, reply) => {
            // The HTML will determine the theme on the client side using localStorage / prefers-color-scheme
            reply.type('text/html').send(getScalarPageHtml());
        },
    );

    console.log('Swagger UI registered at /api/v1/swagger');
    console.log('OpenAPI spec available at /api/v1/openapi.json (auto-generated from route schemas)');
}

function getScalarPageHtml() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; 
        script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net; 
        style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.scalar.com; 
        font-src 'self' data: https://cdn.jsdelivr.net https://fonts.scalar.com; 
        img-src 'self' data: https:; 
        connect-src 'self' http://localhost:* ws://localhost:*; 
        frame-src 'self' blob:; 
        worker-src 'self' blob:; 
        object-src 'none';">
    <title>${Env.appName} - API Reference</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
</head>
<body>
    <div id="api-reference" 
        data-url="/api/v1/openapi.json" 
        data-configuration='{"showSidebar":true,"hideModels":true,"theme":"default","darkMode":true,"layout":"modern"}'>
    </div>

    <script>
        // update the above div with current theme
        function updateTheme(isDark) {
            const apiRef = document.getElementById('api-reference');
            if (apiRef) {
                console.log('[Scalar] dataset:', typeof apiRef.dataset.configuration, apiRef.dataset.configuration);
                const currentConfig = JSON.parse(apiRef.dataset.configuration);
                if (currentConfig.darkMode === isDark) return;
                const newConfig = { ...currentConfig, darkMode: isDark };
                console.log('[Scalar] newConfig:', newConfig);
                apiRef.dataset.configuration = JSON.stringify(newConfig);
            }
        }

        // update the above div with current theme
        const isDark = (localStorage.getItem('theme') === 'dark') || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.setAttribute('color-scheme', isDark ? 'dark' : 'light');
        updateTheme(isDark);
     </script>

    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.25.0"></script>

    <script>
        console.log('[Scalar] Initializing theme sync...');

        // Listen for theme changes from parent window
        window.addEventListener('message', (event) => {
            // Security: Only accept messages from same origin
            if (event.origin !== window.location.origin) return;

            console.log('[Scalar] Received message:', event.data);
            if (event.data && event.data.type === 'theme-change') {
                document.location.reload();
            }
        });

        // Send ready message to parent to request initial theme
        window.addEventListener('load', () => {
            console.log('[Scalar] Page loaded, sending ready message to parent');
            if (window.parent !== window) {
                window.parent.postMessage({ type: 'scalar-ready' }, window.location.origin);
            }
        });
    </script>
</body>
</html>`;
}
