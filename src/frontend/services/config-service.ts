import { z } from '../../shared/libs/validator';
import type { MCPServerConfig } from '../../shared/types/mcp-config';
import { mcpServerConfigSchema } from '../../shared/types/mcp-config';
import type { j } from '../main';

/**
 * Service for managing MCP server CRUD operations
 */
export class ConfigService {
    constructor(private _ctx: j.Context) { }

    async loadServers(): Promise<void> {
        try {
            this._ctx.setState('servers.loading', true);
            this._ctx.setState('servers.error', '');

            const data = await this._ctx.api.fetch<{ servers: MCPServerConfig[] }>('config');
            this._ctx.setState('servers.items', data.servers || []);
            this._ctx.setState('servers.loading', false);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this._ctx.setState('servers.error', errorMsg);
            this._ctx.setState('servers.loading', false);
        }
    }

    async saveServer(): Promise<void> {
        const modalMode = this._ctx.getState<string>('ui.serverModalMode');

        // Load data directly from state - build MCPServerConfig structure
        const name = (this._ctx.getState<string>('serverModal.name.value') || '').trim();
        const transport = this._ctx.getState<string>('serverModal.transport.value') || 'stdio';
        const command = (this._ctx.getState<string>('serverModal.command.value') || '').trim();
        const url = (this._ctx.getState<string>('serverModal.url.value') || '').trim();
        const argsStr = (this._ctx.getState<string>('serverModal.args.value') || '').trim();
        const description = (this._ctx.getState<string>('serverModal.description.value') || '').trim();
        const enabled = this._ctx.getState<boolean>('serverModal.enabled.value', true);

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
                await this._ctx.api.fetch('config', {
                    method: 'POST',
                    body: JSON.stringify(validatedConfig),
                });
            } else {
                await this._ctx.api.fetch(`config/${name}`, {
                    method: 'PATCH',
                    body: JSON.stringify(validatedConfig),
                });
            }

            // Close modal on success
            this._ctx.setState('ui.showServerModal', false);
            await this.loadServers();
        } catch (error) {
            console.error('Failed to save server:', error);
            // Keep modal open and log error - user can see in console
        }
    }

    async setServerEnabled(name: string, enabled: boolean): Promise<void> {
        try {
            await this._ctx.api.fetch(`config/${name}/enabled`, {
                method: 'PATCH',
                body: JSON.stringify({ enabled }),
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
            await this._ctx.api.fetch(`config/${name}`, { method: 'DELETE' });
            await this.loadServers();
        } catch (error) {
            console.error('Failed to delete server:', error);
            alert(`Failed to delete server: ${(error as Error).message}`);
        }
    }

    /**
     * Static factory method for creating the headless component
     * This allows ConfigService to be used directly in headlessComponents registration
     * Returns { api: service } - HeadlessManager extracts 'api' and assigns to ctx[key] where key='config'
     */
    static headless: j.juris.HeadlessComponentFunction<ConfigService> = (_props: unknown, ctx: unknown) => {
        const service = new ConfigService(ctx as j.Context);
        return {
            api: service,
        };
    };
}
