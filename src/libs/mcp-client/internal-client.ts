/**
 * Internal MCP Client - Serves builtin tools (health, format_number)
 * Implements the MCPClient interface to provide a uniform way to access builtin tools
 */

import type { ToolDefinition, ToolResult } from '../mcp-server';
import type { MCPClient } from './client';

/**
 * Internal client for builtin tools
 * This allows builtin tools to be treated like any other MCP server
 */
export class InternalClient extends EventTarget implements MCPClient {
    private _connected = false;
    private _tools: Map<string, { definition: ToolDefinition; handler: (args: unknown) => Promise<ToolResult> }> = new Map();

    refCount = 0;

    constructor() {
        super();
        this._registerBuiltinTools();
    }

    /**
     * Register all builtin tools
     */
    private _registerBuiltinTools(): void {
        // Health tool
        this._tools.set('health', {
            definition: {
                name: 'health',
                description: 'Check the health and status of the MCP aggregator service',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            handler: async (): Promise<ToolResult> => {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(
                                {
                                    status: 'ok',
                                    timestamp: new Date().toISOString(),
                                    uptime: process.uptime(),
                                    memory: process.memoryUsage(),
                                    pid: process.pid,
                                },
                                null,
                                2,
                            ),
                        },
                    ],
                    isError: false,
                };
            },
        });

        // Format number tool
        this._tools.set('format_number', {
            definition: {
                name: 'format_number',
                description: 'Format a number with thousands separators and optional decimal places',
                inputSchema: {
                    type: 'object',
                    properties: {
                        number: {
                            type: 'number',
                            description: 'The number to format',
                        },
                        decimals: {
                            type: 'number',
                            description: 'Number of decimal places (default: 0)',
                        },
                        locale: {
                            type: 'string',
                            description: 'Locale for formatting (default: en-US)',
                        },
                    },
                    required: ['number'],
                },
            },
            handler: async (args: unknown): Promise<ToolResult> => {
                const params = args as { number: number; decimals?: number; locale?: string };
                const { number, decimals = 0, locale = 'en-US' } = params;

                if (typeof number !== 'number') {
                    return {
                        content: [{ type: 'text', text: 'Error: number parameter must be a number' }],
                        isError: true,
                    };
                }

                try {
                    const formatted = new Intl.NumberFormat(locale, {
                        minimumFractionDigits: decimals,
                        maximumFractionDigits: decimals,
                    }).format(number);

                    // Return JSON object with formatted result and metadata
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    formatted,
                                    number,
                                    locale,
                                }),
                            },
                        ],
                        isError: false,
                    };
                } catch (err) {
                    return {
                        content: [{ type: 'text', text: `Error formatting number: ${err}` }],
                        isError: true,
                    };
                }
            },
        });
    }

    async connect(): Promise<void> {
        if (this._connected) return;
        this._connected = true;
        this.dispatchEvent(new Event('connected'));
    }

    get connected(): boolean {
        return this._connected;
    }

    async listTools(): Promise<ToolDefinition[]> {
        return Array.from(this._tools.values()).map((t) => t.definition);
    }

    async callTool(toolName: string, args: Record<string, unknown>): Promise<ToolResult> {
        const tool = this._tools.get(toolName);
        if (!tool) {
            return {
                content: [{ type: 'text', text: `Tool not found: ${toolName}` }],
                isError: true,
            };
        }

        return tool.handler(args);
    }

    async close(): Promise<void> {
        if (!this._connected) return;
        this._connected = false;
        this.dispatchEvent(new Event('disconnected'));
    }
}
