/**
 * MCP Configuration App - Main Entry Point
 * JurisJS application for managing MCP server configurations
 */

import { ApiClient } from '../shared/libs/api-client';
import { z } from '../shared/libs/validator';
import type { MCPServerConfig } from '../shared/types/mcp-config';
import { mcpServerConfigSchema } from '../shared/types/mcp-config';
import { Env } from '../shared/utils/env';
import { registerModal } from './components/modal';
import { registerThemeSwitch } from './components/theme-switch';
import { initialState } from './state';
import type { JurisConstructor, JurisInstance } from './types/juris';
import { registerAppShell } from './views/app-shell';
import { registerMcpConfigPage } from './views/mcp-config-page';
import { registerServerModal } from './views/server-modal';
import { registerServerTable } from './views/server-table';

// biome-ignore lint/style/useNamingConvention: Juris is an external library global
declare const Juris: JurisConstructor;

export class McpConfigApp {
    private _api: ApiClient;
    public juris!: JurisInstance;

    constructor() {
        // Initialize API client with base URL
        // Default: same-origin absolute URL for development/production
        // Optional override on development: set the API on query string `?apiBase=https://api.example.com`
        let apiBase = `${window.location.origin}/api/v1/`;
        if (Env.nodeEnv === 'development') {
            const sp = new URLSearchParams(window.location.search);
            const override = sp.get('apiBase');
            if (override) {
                // User provided full URL for cross-origin API
                apiBase = override.endsWith('/') ? override : `${override}/`;
            }
        }
        this._api = new ApiClient(apiBase);

        Env.print();

        this.setupJuris();
        this.render();
        this.loadServers();
    }

    setupJuris(): void {
        const isDev = process.env.NODE_ENV === 'development';

        this.juris = new Juris({
            logLevel: isDev ? 'info' : 'error',
            states: initialState,
            layout: {
                AppShell: {},
            },
            // Enable CSS extraction for component-based CSS isolation
            features: {
                cssExtractor: CSSExtractor, // Enable CSS extraction
            }
        });

        // Register all components - centralized registration
        registerAppShell(this.juris, this);
        registerModal(this.juris);
        registerMcpConfigPage(this.juris, this);
        registerServerTable(this.juris, this);
        registerServerModal(this.juris, this);
        registerThemeSwitch(this.juris);
    }

    async loadServers(): Promise<void> {
        try {
            this.juris.setState('servers.loading', true);
            this.juris.setState('servers.error', '');
            this.render();

            const data = await this._api.fetch<{ servers: MCPServerConfig[] }>('config');
            this.juris.setState('servers.items', data.servers || []);
            this.juris.setState('servers.loading', false);
            this.render();
        } catch (error) {
            console.error('Failed to load servers:', error);
            this.juris.setState('servers.error', (error as Error).message);
            this.juris.setState('servers.loading', false);
            this.render();
        }
    }

    async saveServer(): Promise<void> {
        const modalMode = this.juris.getState<string>('ui.serverModalMode');

        // Load data directly from state - build MCPServerConfig structure
        const name = (this.juris.getState<string>('serverModal.name.value') || '').trim();
        const transport = this.juris.getState<string>('serverModal.transport.value') || 'stdio';
        const command = (this.juris.getState<string>('serverModal.command.value') || '').trim();
        const url = (this.juris.getState<string>('serverModal.url.value') || '').trim();
        const argsStr = (this.juris.getState<string>('serverModal.args.value') || '').trim();
        const description = (this.juris.getState<string>('serverModal.description.value') || '').trim();
        const enabled = this.juris.getState<boolean>('serverModal.enabled.value', true);

        // Build config object based on transport type
        const serverConfig: unknown =
            transport === 'stdio'
                ? {
                    name,
                    transport: 'stdio',
                    command,
                    args: argsStr ? argsStr.split(/\s+/).filter((a) => a.length > 0) : undefined,
                    enabled,
                    description: description || undefined,
                }
                : {
                    name,
                    transport,
                    url,
                    enabled,
                    description: description || undefined,
                };

        // Validate using MCPServerConfigSchema
        const result = z.safeParse(mcpServerConfigSchema, serverConfig);

        if (!result.success) {
            console.error('Validation failed:', result.error.message);
            // Validation errors should already be shown inline in the form
            return;
        }

        const validatedConfig: MCPServerConfig = result.data;

        try {
            if (modalMode === 'create') {
                await this._api.fetch('config', {
                    method: 'POST',
                    body: JSON.stringify(validatedConfig),
                });
            } else {
                await this._api.fetch(`config/${name}`, {
                    method: 'PATCH',
                    body: JSON.stringify(validatedConfig),
                });
            }

            // Close modal on success
            this.juris.setState('ui.showServerModal', false);
            await this.loadServers();
        } catch (error) {
            console.error('Failed to save server:', error);
            // Keep modal open and log error - user can see in console
        }
    }

    async enableServer(name: string, currentEnabled: boolean): Promise<void> {
        try {
            await this._api.fetch(`config/${name}/enabled`, {
                method: 'PATCH',
                body: JSON.stringify({ enabled: !currentEnabled }),
            });
            await this.loadServers();
        } catch (error) {
            console.error('Failed to toggle server:', error);
            alert(`Failed to toggle server: ${(error as Error).message}`);
        }
    }

    async deleteServer(name: string): Promise<void> {
        if (!confirm(`Are you sure you want to delete server "${name}"?`)) {
            return;
        }

        try {
            await this._api.fetch(`config/${name}`, { method: 'DELETE' });
            await this.loadServers();
        } catch (error) {
            console.error('Failed to delete server:', error);
            alert(`Failed to delete server: ${(error as Error).message}`);
        }
    }

    render(): void {
        this.juris.render('#app');
    }
}

// Initialize the app when the page loads
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        window.mcpApp = new McpConfigApp();
    });
}
