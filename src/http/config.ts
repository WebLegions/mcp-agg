/**
 * MCP Server Configuration REST API
 * CRUD operations for MCP server configurations
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getManager } from '../controllers/mcp-controller/config';
import { registerMCPServerTools } from '../controllers/mcp-controller/register';
import { MCPServer } from '../libs/mcp-server';
import { z } from '../shared/libs/validator';
import type { MCPServerConfig } from '../shared/types/mcp-config';
import { mcpServerConfigSchema } from '../shared/types/mcp-config';
import { Env } from '../utils';
import type { RouteSchema, WithBody, WithParams, WithParamsAndBody, WithQuerystring } from './route-types';

/**
 * Common response schemas
 */
const successResponse = z
    .object({
        name: z.string(),
        message: z.string(),
    })
    .describe('Success');

const errorResponse = z.object({
    error: z.string(),
});

const enabledResponse = z
    .object({
        name: z.string(),
        enabled: z.boolean(),
        message: z.string(),
    })
    .describe('Server enabled/disabled response');

const listResponse = z
    .object({
        servers: z.array(z.unknown()),
        total: z.number(),
    })
    .describe('List of MCP servers');

const toolsResponse = z
    .object({
        tools: z.array(
            z.object({
                name: z.string(),
                description: z.string().optional(),
                inputSchema: z.unknown(),
                serverName: z.string(),
            }),
        ),
        total: z.number(),
        summary: z.object({
            totalTools: z.number(),
            builtinTools: z.number(),
            externalTools: z.number(),
            serverBreakdown: z.map(z.number()),
        }),
    })
    .describe('List of available MCP tools');

/**
 * Request schemas for MCP configuration endpoints
 */
const listServersSchema: RouteSchema = {
    description: 'List all MCP server configurations',
    tags: ['MCP Configuration'],
    summary: 'Get all MCP servers',
    response: {
        200: listResponse,
        404: errorResponse.describe('Servers not found'),
    },
};

const getServerSchema: RouteSchema = {
    description: 'Get a specific MCP server configuration by name',
    tags: ['MCP Configuration'],
    summary: 'Get MCP server by name',
    params: z.object({
        name: z.string().min(1).max(120),
    }),
    response: {
        200: mcpServerConfigSchema,
        404: errorResponse.describe('Server not found'),
    },
};

const createServerSchema: RouteSchema = {
    description: 'Create a new MCP server configuration',
    tags: ['MCP Configuration'],
    summary: 'Create MCP server',
    body: mcpServerConfigSchema,
    response: {
        201: successResponse,
        400: errorResponse.describe('Invalid server configuration'),
        409: errorResponse.describe('Server already exists'),
    },
};

const updateServerSchema: RouteSchema = {
    description: 'Update an existing MCP server configuration',
    tags: ['MCP Configuration'],
    summary: 'Update MCP server',
    params: z.object({
        name: z.string().min(1).max(120),
    }),
    body: z.object({
        transport: z.union([z.literal('stdio'), z.literal('sse'), z.literal('http')]).optional(),
        command: z.string().optional(),
        args: z.array(z.string()).optional(),
        url: z.string().url().optional(),
        env: z.map(z.string()).optional(),
        enabled: z.boolean().optional(),
        description: z.string().optional(),
    }),
    response: {
        200: successResponse,
        404: errorResponse.describe('Server not found'),
        400: errorResponse.describe('Invalid server configuration'),
    },
};

const deleteServerSchema: RouteSchema = {
    description: 'Delete an MCP server configuration',
    tags: ['MCP Configuration'],
    summary: 'Delete MCP server',
    params: z.object({
        name: z.string().min(1).max(120),
    }),
    response: {
        200: successResponse,
        404: errorResponse.describe('Server not found'),
    },
};

const enableServerSchema: RouteSchema = {
    description: 'Enable or disable an MCP server',
    tags: ['MCP Configuration'],
    summary: 'Enable/disable MCP server',
    params: z.object({
        name: z.string().min(1).max(120),
    }),
    body: z.object({
        enabled: z.boolean(),
    }),
    response: {
        200: enabledResponse,
        404: errorResponse.describe('Server not found'),
    },
};

const listToolsSchema: RouteSchema = {
    description: 'List all available MCP tools from all servers (or filtered by server name)',
    tags: ['MCP Configuration'],
    summary: 'List MCP tools',
    querystring: z.object({
        server: z.string().optional(),
    }),
    response: {
        200: toolsResponse,
        404: errorResponse.describe('Server not found'),
    },
};

/**
 * Register MCP configuration management routes
 */
export function registerConfig(app: FastifyInstance): void {
    const manager = getManager();

    // GET /api/v1/config - List all servers
    app.get('/api/v1/config', { schema: listServersSchema }, async (_request: FastifyRequest, reply: FastifyReply) => {
        const servers = await manager.getAllServers();
        return reply.code(200).send({
            servers,
            total: servers.length,
        });
    });

    // GET /api/v1/config/:name - Get specific server
    app.get<WithParams<{ name: string }>>(
        '/api/v1/config/:name',
        { schema: getServerSchema },
        async (request: FastifyRequest<WithParams<{ name: string }>>, reply: FastifyReply) => {
            const server = await manager.getServer(request.params.name);
            if (!server) {
                return reply.code(404).send({ error: `Server '${request.params.name}' not found` });
            }

            return reply.code(200).send(server);
        },
    );

    // POST /api/v1/config - Create new server
    app.post<WithBody<MCPServerConfig>>(
        '/api/v1/config',
        { schema: createServerSchema },
        async (request: FastifyRequest<WithBody<MCPServerConfig>>, reply: FastifyReply) => {
            // Validate request body
            const config = mcpServerConfigSchema.parse(request.body);

            // Check if server already exists
            const existing = await manager.getServer(config.name);
            if (existing) {
                return reply.code(409).send({ error: `Server '${config.name}' already exists` });
            }

            // Add server
            await manager.upsertServer(config);

            return reply.code(201).send({
                name: config.name,
                message: 'Server created successfully',
            });
        },
    );

    // PUT /api/v1/config/:name - Update server (full replace)
    app.put<WithParamsAndBody<{ name: string }, Partial<MCPServerConfig>>>(
        '/api/v1/config/:name',
        { schema: updateServerSchema },
        async (request: FastifyRequest<WithParamsAndBody<{ name: string }, Partial<MCPServerConfig>>>, reply: FastifyReply) => {
            // Check if server exists
            const existing = await manager.getServer(request.params.name);
            if (!existing) {
                return reply.code(404).send({ error: `Server '${request.params.name}' not found` });
            }

            // Merge with existing config
            const updated = { ...existing, ...request.body, name: request.params.name };

            // Validate merged config
            const validConfig = mcpServerConfigSchema.parse(updated);

            // Upsert server config
            await manager.upsertServer(validConfig);

            return reply.code(200).send({
                name: request.params.name,
                message: 'Server updated successfully',
            });
        },
    );

    // PATCH /api/v1/config/:name - Partial update
    app.patch<WithParamsAndBody<{ name: string }, Partial<MCPServerConfig>>>(
        '/api/v1/config/:name',
        { schema: updateServerSchema },
        async (request: FastifyRequest<WithParamsAndBody<{ name: string }, Partial<MCPServerConfig>>>, reply: FastifyReply) => {
            // Check if server exists
            const existing = await manager.getServer(request.params.name);
            if (!existing) {
                return reply.code(404).send({ error: `Server '${request.params.name}' not found` });
            }

            // Merge with existing config
            const updated = { ...existing, ...request.body, name: request.params.name };

            // Validate merged config
            const validConfig = mcpServerConfigSchema.parse(updated);

            // Upsert server config
            await manager.upsertServer(validConfig);

            return reply.code(200).send({
                name: request.params.name,
                message: 'Server updated successfully',
            });
        },
    );

    // DELETE /api/v1/config/:name - Delete server
    app.delete<WithParams<{ name: string }>>(
        '/api/v1/config/:name',
        { schema: deleteServerSchema },
        async (request: FastifyRequest<WithParams<{ name: string }>>, reply: FastifyReply) => {
            const removed = await manager.removeServer(request.params.name);
            if (!removed) {
                return reply.code(404).send({ error: `Server '${request.params.name}' not found` });
            }

            return reply.code(200).send({
                name: request.params.name,
                message: 'Server deleted successfully',
            });
        },
    );

    // PATCH /api/v1/config/:name/enabled - Enable/disable server
    app.patch<WithParamsAndBody<{ name: string }, { enabled: boolean }>>(
        '/api/v1/config/:name/enabled',
        { schema: enableServerSchema },
        async (request: FastifyRequest<WithParamsAndBody<{ name: string }, { enabled: boolean }>>, reply: FastifyReply) => {
            // Check if server exists
            const existing = await manager.getServer(request.params.name);
            if (!existing) {
                return reply.code(404).send({ error: `Server '${request.params.name}' not found` });
            }

            // Update enabled status
            await manager.enable(request.params.name, request.body.enabled);

            return reply.code(200).send({
                name: request.params.name,
                enabled: request.body.enabled,
                message: `Server ${request.body.enabled ? 'enabled' : 'disabled'} successfully`,
            });
        },
    );

    // GET /api/v1/config/tools - List all tools (or filter by server)
    app.get<WithQuerystring<{ server?: string }>>(
        '/api/v1/config/tools',
        { schema: listToolsSchema },
        async (request: FastifyRequest<WithQuerystring<{ server?: string }>>, reply: FastifyReply) => {
            const { server: serverFilter } = request.query;

            // If filtering by server, check if it exists (except for "builtin")
            if (serverFilter && serverFilter !== 'builtin') {
                const serverConfig = await manager.getServer(serverFilter);
                if (!serverConfig) {
                    return reply.code(404).send({ error: `Server '${serverFilter}' not found` });
                }
            }

            // Create a temporary MCP server to gather all tools
            const tempServer = new MCPServer({
                name: Env.appName,
                version: Env.appVersion,
            });

            // Register all tools (including builtin via InternalClient)
            await registerMCPServerTools(tempServer);

            // Get all tools using the public API
            const allTools = tempServer.getAllTools();

            // Build response with metadata
            const tools: Array<{
                name: string;
                description?: string;
                inputSchema: unknown;
                serverName: string;
            }> = [];

            const serverBreakdown = new Map<string, number>();
            let builtinTools = 0;
            let externalTools = 0;

            for (const [toolName, toolInfo] of allTools.entries()) {
                const { definition, serverName } = toolInfo;

                // Apply server filter if specified
                if (serverFilter && serverName !== serverFilter && serverName !== 'builtin') {
                    continue;
                }

                // Track statistics
                if (serverName === 'builtin') {
                    builtinTools++;
                } else {
                    externalTools++;
                }

                serverBreakdown.set(serverName, (serverBreakdown.get(serverName) || 0) + 1);

                tools.push({
                    name: toolName,
                    description: definition.description,
                    inputSchema: definition.inputSchema,
                    serverName,
                });
            }

            // Cleanup temporary server
            await tempServer.close();

            return reply.code(200).send({
                tools,
                total: tools.length,
                summary: {
                    totalTools: tools.length,
                    builtinTools,
                    externalTools,
                    serverBreakdown,
                },
            });
        },
    );
}
