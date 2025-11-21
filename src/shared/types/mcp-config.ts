/**
 * MCP Configuration Types and Schemas
 *
 * Defines Validator schemas for MCP server configurations
 * All types are inferred from schemas for consistency
 * Compatible with Claude Desktop MCP configuration format
 */

import { type Infer, z } from '../libs/validator';

export const mcpTransportSchema = z.enum(['stdio', 'sse', 'http'] as const);
export type MCPTransport = Infer<typeof mcpTransportSchema>;

export const mcpEnvSchema = z.record(z.string());
export type MCPEnv = Infer<typeof mcpEnvSchema>; // Map<string, string>

/** Stdio */
export const mcpStdioConfigSchema = z.object({
    transport: z.literal('stdio'),
    command: z.string().min(1).describe('Command to execute').examples('npx -y @modelcontextprotocol/server-example'),
    args: z.array(z.string()).optional().describe('Command arguments').examples('--port', '3000'),
    env: mcpEnvSchema.optional().describe('Environment variables'),
});

export type MCPStdioConfig = Infer<typeof mcpStdioConfigSchema>;

/** SSE */
export const mcpSSEConfigSchema = z.object({
    transport: z.literal('sse'),
    url: z.string().url().describe('SSE endpoint URL'),
    env: mcpEnvSchema.optional().describe('Environment variables'),
});

export type MCPSSEConfig = Infer<typeof mcpSSEConfigSchema>;

/** HTTP */
export const mcpHTTPConfigSchema = z.object({
    transport: z.literal('http'),
    url: z.string().url().describe('HTTP endpoint URL'),
    env: mcpEnvSchema.optional().describe('Environment variables'),
});

export type MCPHTTPConfig = Infer<typeof mcpHTTPConfigSchema>;

/**
 * Schema for the MCP server persistency
 */

export const mcpGenericSchema = z.object({
    name: z.string().min(1).max(120).describe('Unique server id').examples('my-mcp-server'),
    enabled: z.boolean().optional().describe('Whether server is enabled (default: true)'),
    description: z.string().optional().examples('Example MCP server for testing'),
});

export const mcpStdioServerSchema = mcpGenericSchema.extend({
    transport: z.literal('stdio'),
    command: z.string().min(1).describe('Command to execute').examples('npx -y @modelcontextprotocol/server-example'),
    args: z.array(z.string()).optional().describe('Command arguments').examples('[--port, 8080]', '3000'),
    env: mcpEnvSchema.optional().describe('Environment variables'),
});

export const mcpSSEServerSchema = mcpGenericSchema.extend({
    transport: z.literal('sse'),
    url: z.string().url().describe('SSE endpoint URL'),
    env: mcpEnvSchema.optional().describe('Environment variables'),
});

export const mcpHTTPServerSchema = mcpGenericSchema.extend({
    transport: z.literal('http'),
    url: z.string().url().describe('HTTP endpoint URL'),
    env: mcpEnvSchema.optional().describe('Environment variables'),
});

export const mcpServerConfigSchema = z.union([mcpStdioServerSchema, mcpSSEServerSchema, mcpHTTPServerSchema]);
export type MCPServerConfig = Infer<typeof mcpServerConfigSchema>;

/**
 * Config file structure uses server name as record key
 */
export const mcpConfigFileSchema = z.object({
    mcpServers: z.record(mcpServerConfigSchema),
});

export type MCPConfigFile = Infer<typeof mcpConfigFileSchema>;

export const DEFAULT_MCP_CONFIG: MCPConfigFile = {
    mcpServers: new Map<string, MCPServerConfig>(),
};
