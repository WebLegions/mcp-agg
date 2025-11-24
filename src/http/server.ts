import { join } from 'node:path';
import { getSystemErrorName } from 'node:util';
import Fastify, { type FastifyInstance } from 'fastify';
import { Env } from '../shared/utils/env';
import { ErrorEx } from '../shared/utils/error';
import { fromHumanBytes } from '../shared/utils/text';
import { replacerFn, reviverFn } from '../utils/immutable';
import { registerConfig } from './config';
import { registerErrorHandler } from './error-handler';
import { registerHealth } from './health';
import { registerHello } from './hello';
import { registerMCP } from './mcp';
import { registerSecurityPlugins } from './security';
import { registerStatic } from './static';
import { registerSwagger } from './swagger';
import { registerEnvInject, registerTranspile } from './transpile';
import { type Provider, schemaCompiler, serializerCompiler } from './type-provider';

/**
 * Get user-friendly error message from any error type
 * Handles system errors (NodeJS.ErrnoException) with special formatting
 */
/* istanbul ignore next **/
function getErrorMessage(err: unknown, port?: number): string {
    // Handle NodeJS system errors with error codes
    if (err && typeof err === 'object' && 'code' in err) {
        const sysErr = err as NodeJS.ErrnoException;
        const code = sysErr.code;

        if (!code) {
            return sysErr.message || String(err);
        }

        // Get the system error name (e.g., EADDRINUSE)
        // Note: getSystemErrorName requires negative errno, use code as fallback
        let errorName = code;
        if (sysErr.errno && sysErr.errno < 0) {
            try {
                errorName = getSystemErrorName(sysErr.errno) || code;
            } catch {
                // Fallback to code if getSystemErrorName fails
                errorName = code;
            }
        }

        // Special case for EADDRINUSE
        if (code === 'EADDRINUSE') {
            return `Port ${port ?? 'unknown'} is already in use. Is another server already running?`;
        }

        // Map common error codes to user-friendly messages
        const errorMessages: Record<string, string> = {
            EACCES: `Permission denied. Port ${port ?? 'unknown'} requires elevated privileges (try sudo or use port > 1024)`,
            EADDRNOTAVAIL: 'Address not available. Check if the host address is valid',
            ECONNREFUSED: 'Connection refused. The server is not accepting connections',
            ECONNRESET: 'Connection reset by peer',
            ETIMEDOUT: 'Connection timed out',
            ENOTFOUND: 'Host not found. Check your network connection',
            ENOENT: 'File or directory not found',
        };

        return errorMessages[code] || `${errorName}: ${sysErr.message}`;
    }

    // Handle standard Error objects
    if (err instanceof Error) {
        return err.message;
    }

    // Fallback for unknown error types
    return String(err);
}

/**
 * Create and configure Fastify server instance
 */
export function createServer() {
    const app = Fastify({
        logger: false, // Using plain console instead of pino
        bodyLimit: fromHumanBytes(Env.get('MAX_BODY_SIZE', '10mb')),
        routerOptions: {
            maxParamLength: Env.get('MAX_URL_LENGTH', 4096),
        },
    })
        .withTypeProvider<Provider>()
        .setValidatorCompiler(schemaCompiler)
        .setSerializerCompiler(serializerCompiler);

    // Use JSON.parse with custom reviver for BigInt support and __ property filtering
    // This replaces Fastify's default secure-json-parse with the much faster Bun.parse.
    app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
        try {
            const text = typeof body === 'string' ? body : body.toString();
            const json = JSON.parse(text, reviverFn);
            done(null, json);
        } catch (err) {
            done(err instanceof Error ? err : new ErrorEx(err), undefined);
        }
    });

    // Set default reply serializer to handle BigInt globally (for routes without schemas)
    app.setReplySerializer((payload, _statusCode) => {
        return JSON.stringify(payload, replacerFn, 0);
    });

    return app;
}

/**
 * Register all routes and plugins
 */
export async function registerRoutes(app: FastifyInstance) {
    // Security plugins FIRST (order matters!)
    await registerSecurityPlugins(app);

    // Swagger plugin BEFORE routes (to capture route schemas during registration)
    await registerSwagger(app);

    // API routes
    registerHealth(app);
    registerHello(app);
    registerMCP(app);
    registerConfig(app); // MCP server configuration CRUD API

    // Transpiled routes for frontend app.
    const frontend = join(__dirname, '..', 'frontend');
    registerTranspile(app, frontend, '/app');

    const shared = join(__dirname, '..', 'shared');
    registerTranspile(app, shared, '/shared');

    // Error handlers for nice-looing error page
    registerErrorHandler(app);

    // Inject env vars into HTML files
    const publicDir = join(__dirname, '..', 'public');
    await registerEnvInject(app, ['index.html'], publicDir);

    // Static file serving (must be last to avoid route conflicts)
    await registerStatic(app, '../public', '/');
}

/**
 * Start HTTP server
 */
export async function startServer(app: FastifyInstance) {
    const port = Number.parseInt(process.env.PORT ?? '3000', 10);
    const host = process.env.HOST ?? '0.0.0.0';

    try {
        await app.listen({ port, host });
        console.log(`Server listening on http://${host}:${port}`);
        console.log(`Health check: http://${host}:${port}/health`);
        console.log(`Swagger UI: http://${host}:${port}/api/v1/swagger`);
    } catch (err) {
        // Get user-friendly error message
        const errorMessage = getErrorMessage(err, port);
        console.error(`Error starting server: ${errorMessage}`);

        // In test mode (NODE_TEST_CONTEXT set), throw error instead of exiting
        if (process.env.NODE_TEST_CONTEXT) {
            throw err;
        }
        process.exit(1);
    }
}
