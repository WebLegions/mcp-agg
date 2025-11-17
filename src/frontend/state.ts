/**
 * Application State Management
 * Centralized state structure and type-safe state keys
 */

/**
 * Valid state keys - enforces dot-notation naming convention
 * All state keys must be defined here for compile-time validation
 */
export type StateKey =
    // Server data
    | 'servers.items'
    | 'servers.loading'
    | 'servers.error'
    // UI state
    | 'ui.openMenuId'
    | 'ui.showServerModal'
    | 'ui.serverModalMode'
    // Server modal form fields
    | 'serverModal.name'
    | 'serverModal.transport'
    | 'serverModal.command'
    | 'serverModal.url'
    | 'serverModal.args'
    | 'serverModal.enabled'
    | 'serverModal.description'
    // Server modal validation errors
    | 'serverModal.name.error'
    | 'serverModal.transport.error'
    | 'serverModal.command.error'
    | 'serverModal.url.error'
    | 'serverModal.args.error'
    | 'serverModal.description.error';

/**
 * Initial application state structure
 * Matches the state keys defined in StateKey type
 */
export const initialState = {
    servers: {
        items: [],
        loading: true,
        error: null,
    },
    ui: {
        openMenuId: null,
        showServerModal: false,
        serverModalMode: 'create',
    },
    serverModal: {
        name: '',
        transport: 'stdio',
        command: '',
        url: '',
        args: '',
        enabled: true,
        description: '',
        // Nested error object
        error: {},
    },
} as const;
