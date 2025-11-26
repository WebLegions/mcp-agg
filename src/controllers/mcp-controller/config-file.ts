/**
 * MCP Configuration File Manager
 *
 * Event-based manager for MCP server configurations
 * - Class-based design with EventEmitter
 * - No circular dependencies
 * - Synchronous broadcast via events
 * - File watching in cluster mode
 */

import { EventEmitter } from 'node:events';
import type { FSWatcher } from 'node:fs';
import { watch } from 'node:fs';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { McpError } from '../../libs/mcp-server';
import {
    type MCPConfigFile,
    type MCPEnv,
    type MCPServerConfig,
    type MCPTransport,
    mcpConfigFileSchema,
    mcpServerConfigSchema,
} from '../../shared/types/mcp-config';
import { access, atExit, copyFile, Env, mkdir, writeFile } from '../../utils';

/** MCPConfigManager events */
export interface MCPConfigManagerEvents {
    'config:changed': () => void;
}

export class MCPConfigManager extends EventEmitter {
    // Event emitter type augmentation for proper typing
    declare on: <K extends keyof MCPConfigManagerEvents>(event: K, listener: MCPConfigManagerEvents[K]) => this;
    declare emit: <K extends keyof MCPConfigManagerEvents>(event: K, ...args: Parameters<MCPConfigManagerEvents[K]>) => boolean;
    private _configPath: string;
    private _watcher: FSWatcher | undefined;

    /** Get the config file path (for testing) */
    get configPath(): string {
        return this._configPath;
    }

    constructor(
        configPath?: string,
        private _watch = true,
    ) {
        super();
        const file = configPath || Env.get('MCP_CONFIG_FILE', '.mcp.json');
        // If configPath is absolute, use it as-is. Otherwise, resolve relative to var/
        this._configPath = path.isAbsolute(file) ? file : path.resolve(Env.__dirname, 'var', file);

        // Start watching if enabled
        if (this._watch) {
            this._startWatching();
        }
    }

    isValidServer(config: unknown): config is MCPServerConfig {
        const { success } = mcpServerConfigSchema.safeParse(config);
        return success;
    }

    async read(): Promise<MCPConfigFile> {
        let config: MCPConfigFile | undefined;
        let error: McpError | undefined;

        // Try main config file
        try {
            const content = await readFile(this._configPath, 'utf-8');
            const parsed = JSON.parse(content);
            config = mcpConfigFileSchema.parse(parsed);
        } catch (err) {
            error = new McpError(err);
            console.warn('Failed to load MCP config file:', error);
        }

        // If main config is invalid, try backup
        if (!config)
            try {
                const backupPath = `${this._configPath}.backup`;
                const backupContent = await readFile(backupPath, 'utf-8');
                const backupParsed = JSON.parse(backupContent);
                config = mcpConfigFileSchema.parse(backupParsed);
            } catch (err) {
                error = new McpError(err);
                console.warn('Failed to load MCP config file backup:', error);
            }

        if (!config) {
            console.warn('Returning empty config.');
            config = { mcpServers: new Map() };
        }

        // Always ensure builtin server is present
        if (!config.mcpServers.has('builtin')) {
            config.mcpServers.set('builtin', {
                name: 'builtin',
                transport: 'stdio',
                command: 'internal',
                args: [],
                enabled: true,
                description: 'Built-in aggregator tools (health, format_number)',
            });
        }

        return config;
    }

    async write(config: MCPConfigFile): Promise<void> {
        // Check if file exists before writing
        const [, accessErr] = await access(this._configPath);
        const shouldBackup = !accessErr;

        // create folder
        const dir = path.dirname(this._configPath);
        const [, mkdirErr] = await mkdir(dir, { recursive: true });
        if (mkdirErr) {
            throw new McpError(`Failed to create config directory: ${mkdirErr.message}`);
        }

        // Create backup if file exists
        if (shouldBackup) {
            const backupPath = `${this._configPath}.backup`;
            await copyFile(this._configPath, backupPath);
        }

        // Write config - convert Maps to plain objects for JSON serialization
        // Filter out builtin server (it's added automatically on read)
        const serializableConfig = {
            mcpServers: Object.fromEntries(
                Array.from(config.mcpServers.entries())
                    .filter(([name]) => name !== 'builtin')
                    .map(([name, value]) => {
                        const { env, ...rest } = value;
                        return [
                            name,
                            {
                                ...rest,
                                // Convert env Map to object if present
                                env: env ? Object.fromEntries(env) : undefined,
                            },
                        ];
                    }),
            ),
        };
        const content = JSON.stringify(serializableConfig, null, 2);
        const [, writeErr] = await writeFile(this._configPath, content, 'utf-8');
        if (writeErr) {
            throw new McpError(`Failed to write MCP config: ${writeErr.message}`);
        }

        // Start watching if not already watching (file was just created)
        // If watcher is already running, it will detect the change and emit the event
        if (this._watch && !this._watcher) {
            this._startWatching(true);
        }
    }

    /**
     * Find server(s) - returns all servers or a specific server by name
     * @param name - Optional server name to find a specific server
     * @returns Array of all servers, or array with single server if name provided
     */
    async find(): Promise<MCPServerConfig[]>;
    async find(name: string): Promise<MCPServerConfig | undefined>;
    async find(name?: string): Promise<MCPServerConfig[] | MCPServerConfig | undefined> {
        const config = await this.read();
        if (name) {
            return config.mcpServers.get(name);
        }
        return Array.from(config.mcpServers.values());
    }

    /**
     * Create a new server configuration
     * @param serverConfig - Server configuration to create
     * @returns The created server configuration
     */
    async create(serverConfig: MCPServerConfig): Promise<MCPServerConfig> {
        this.isValidServer(serverConfig);
        const config = await this.read();

        // Check if server already exists
        if (config.mcpServers.has(serverConfig.name)) {
            throw new McpError(`Server "${serverConfig.name}" already exists`);
        }

        config.mcpServers.set(serverConfig.name, serverConfig);
        await this.write(config);
        return serverConfig;
    }

    /**
     * Update an existing server configuration
     * @param name - Server name to update
     * @param updates - Partial server configuration to update
     * @returns The updated server configuration
     */
    async update(name: string, updates: Partial<MCPServerConfig>): Promise<MCPServerConfig> {
        const config = await this.read();
        const server = config.mcpServers.get(name);
        if (!server) {
            throw new McpError(`Server "${name}" not found`);
        }

        // Merge updates into existing server config
        const updated = { ...server, ...updates } as MCPServerConfig;
        this.isValidServer(updated);
        config.mcpServers.set(name, updated);
        await this.write(config);
        return updated;
    }

    /**
     * Delete a server configuration
     * @param name - Server name to delete
     */
    async delete(name: string): Promise<void> {
        // Prevent removing builtin server
        if (name === 'builtin') {
            throw new McpError('Cannot remove builtin server');
        }

        const config = await this.read();
        if (!config.mcpServers.has(name)) {
            throw new McpError(`Server "${name}" not found`);
        }

        config.mcpServers.delete(name);
        await this.write(config);
    }

    // ============================================================================
    // Legacy/Deprecated Methods (kept for backward compatibility)
    // ============================================================================

    /** @deprecated Use find() instead */
    async getAllServers(): Promise<MCPServerConfig[]> {
        return (await this.find()) as MCPServerConfig[];
    }

    /** @deprecated Use find(name) instead */
    async getServer(name: string): Promise<MCPServerConfig | undefined> {
        return await this.find(name);
    }

    /** @deprecated Use create() or update() instead */
    async upsertServer(serverConfig: MCPServerConfig): Promise<void> {
        const existing = await this.find(serverConfig.name);
        if (existing) {
            await this.update(serverConfig.name, serverConfig);
        } else {
            await this.create(serverConfig);
        }
    }

    /** @deprecated Use delete() instead */
    async removeServer(name: string): Promise<boolean> {
        try {
            await this.delete(name);
            return true;
        } catch {
            return false;
        }
    }

    async serverExists(name: string): Promise<boolean> {
        const server = await this.find(name);
        return server !== undefined;
    }

    async getEnabled(): Promise<MCPServerConfig[]> {
        const servers = (await this.find()) as MCPServerConfig[];
        return servers.filter((s) => s.enabled);
    }

    /** @deprecated Use update(name, { enabled }) instead */
    async enable(name: string, enabled: boolean): Promise<void> {
        await this.update(name, { enabled });
    }

    // ============================================================================
    // Static Factory Method
    // ============================================================================

    /**
     * Static factory method to create server configurations
     * @param name - Server name
     * @param transport - Transport type (stdio, sse, http)
     * @param commandOrUrl - Command for stdio or URL for sse/http
     * @param args - Optional command arguments for stdio
     * @param env - Optional environment variables
     * @param enabled - Whether server is enabled (default: true)
     * @returns Server configuration object
     */
    static create(
        name: string,
        transport: MCPTransport,
        commandOrUrl: string,
        args?: string[],
        env?: MCPEnv,
        enabled = true,
    ): MCPServerConfig {
        if (transport === 'stdio') {
            const config: MCPServerConfig = { name, transport, command: commandOrUrl, enabled };
            config.args = args ?? [];
            if (env) config.env = env;
            return config;
        }
        if (transport === 'http' || transport === 'sse') {
            const config: MCPServerConfig = { name, transport, url: commandOrUrl, enabled };
            if (env) config.env = env;
            return config;
        }
        throw new McpError(`Unsupported transport type: ${transport}`);
    }

    /**
     * Start watching the config file for external changes.
     * Required for cluster environments where other workers might modify the config.
     *
     * @param emit - If true, emits a config:changed event immediately after starting the watcher.
     * @private - automatically called from constructor
     */
    private _startWatching(emit = false): void {
        if (!this._watch || this._watcher) return;

        // Watch for file changes using synchronous fs.watch()
        try {
            this._watcher = watch(this._configPath, { persistent: true }, (eventType) => {
                if (eventType === 'change' || eventType === 'rename') {
                    this.emit('config:changed');
                }
            });

            atExit(this.cleanup.bind(this));
            if (emit) this.emit('config:changed');
        } catch (_error) {
            // Watch not supported or other error
            console.warn('Failed to start config file watcher:', new McpError(_error));
            this._watcher = undefined;
        }
    }

    /**
     * Clean up resources (stop file watcher)
     * Call this when done with the manager to allow process to exit
     */
    public cleanup(): void {
        if (this._watcher) {
            this._watcher.close();
            this._watcher = undefined;
        }
    }
}

// ============================================================================
// Global Instance (Lazy Singleton Pattern)
// ============================================================================

let _globalManager: MCPConfigManager | undefined;

/**
 * Get or create the global MCPConfigManager instance
 *
 * @param configPath - Optional custom config file path (uses MCP_CONFIG_FILE env var or default if not provided)
 * @param watch - Enable file watching for config changes (default: true)
 *                Set to false for short-running CLI commands to allow process to exit cleanly
 *                Set to true for long-running processes (e.g., MCP serve) that need to react to config changes
 *
 * @returns The global MCPConfigManager singleton instance
 */
export function getManager(configPath?: string, watch = true): MCPConfigManager {
    if (!_globalManager) {
        _globalManager = new MCPConfigManager(configPath, watch);
    }
    return _globalManager;
}
