import { z } from '../../shared/libs/validator';
import type { MCPServerConfig } from '../../shared/types/mcp-config';
import { mcpServerConfigSchema } from '../../shared/types/mcp-config';
import type { j } from '../main';

/**
 * Client for managing MCP server configurations
 * Handles all server CRUD operations and state management
 */
export class ConfigClient {
    constructor(private _ctx: j.Context) {}

    /**
     * Find server(s) - loads all servers or a specific server by name
     * @param name - Optional server name to find a specific server
     */
    async find(name?: string): Promise<void> {
        try {
            this._ctx.setState('servers.loading', true);
            this._ctx.setState('servers.error', '');

            if (name) {
                // Find specific server
                const server = await this._ctx.api.fetch<MCPServerConfig>(`config/${name}`);
                const currentServers = this._ctx.getState<MCPServerConfig[]>('servers.items', []);
                const updatedServers = currentServers.map((s) => (s.name === name ? server : s));
                this._ctx.setState('servers.items', updatedServers);
            } else {
                // Find all servers
                const data = await this._ctx.api.fetch<{ servers: MCPServerConfig[] }>('config');
                this._ctx.setState('servers.items', data.servers || []);
            }

            this._ctx.setState('servers.loading', false);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this._ctx.setState('servers.error', errorMsg);
            this._ctx.setState('servers.loading', false);
        }
    }

    /**
     * Create a new server configuration
     * Reads configuration from modal state, validates, and creates the server
     * @returns The created server configuration
     */
    async create(): Promise<MCPServerConfig | undefined> {
        const config = this._buildConfigFromModal();
        if (!config) return undefined;

        try {
            const result = await this._ctx.api.fetch<MCPServerConfig>('config', {
                method: 'POST',
                body: JSON.stringify(config),
            });

            this._ctx.setState('ui.showServerModal', false);
            await this.find();
            return result;
        } catch (error) {
            console.error('Failed to create server:', error);
            // Keep modal open and log error - user can see in console
            return undefined;
        }
    }

    /**
     * Helper method to build server config from modal state
     * @private
     */
    private _buildConfigFromModal(): MCPServerConfig | undefined {
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
            return undefined;
        }

        return result.data;
    }

    /**
     * Update an existing server configuration
     * Can be called with partial updates or from modal state
     * @param nameOrVoid - Server name for direct updates, undefined for modal-based updates
     * @param updates - Partial server configuration to update
     * @returns The updated server configuration
     */
    async update(name: string, updates: Partial<MCPServerConfig>): Promise<MCPServerConfig | undefined>;
    async update(): Promise<MCPServerConfig | undefined>;
    async update(name?: string, updates?: Partial<MCPServerConfig>): Promise<MCPServerConfig | undefined> {
        try {
            let result: MCPServerConfig | undefined;

            if (name && updates) {
                // Direct update: update(name, { enabled: true })
                result = await this._ctx.api.fetch<MCPServerConfig>(`config/${name}/enabled`, {
                    method: 'PATCH',
                    body: JSON.stringify(updates),
                });
            } else {
                // Modal-based update: update()
                const config = this._buildConfigFromModal();
                if (!config) return undefined;

                result = await this._ctx.api.fetch<MCPServerConfig>(`config/${config.name}`, {
                    method: 'PATCH',
                    body: JSON.stringify(config),
                });
                this._ctx.setState('ui.showServerModal', false);
            }

            await this.find();
            return result;
        } catch (error) {
            console.error('Failed to update server:', error);
            // For direct updates, show alert; for modal updates, keep modal open
            if (name) {
                alert(`Failed to update server: ${(error as Error).message}`);
            }
            return undefined;
        }
    }

    /**
     * Delete a server configuration
     * @param name - Server name to delete
     */
    async delete(name: string): Promise<void> {
        if (!confirm(`Are you sure you want to delete server "${name}"?`)) {
            return;
        }

        try {
            await this._ctx.api.fetch(`config/${name}`, { method: 'DELETE' });
            await this.find();
        } catch (error) {
            console.error('Failed to delete server:', error);
            alert(`Failed to delete server: ${(error as Error).message}`);
        }
    }

    /**
     * Static factory method for creating the headless component
     * This allows ConfigClient to be used directly in headlessComponents registration
     * Returns { api: client } - HeadlessManager extracts 'api' and assigns to ctx[key] where key='config'
     */
    static headless: j.juris.HeadlessComponentFunction<ConfigClient> = (_props: unknown, ctx: unknown) => {
        const client = new ConfigClient(ctx as j.Context);
        return {
            api: client,
        };
    };
}
