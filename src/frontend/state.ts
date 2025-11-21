/**
 * Application State Management
 * Centralized state structure and type-safe state keys
 */

/**
 * Valid state keys - enforces dot-notation naming convention
 * All state keys must be defined here for compile-time validation
 */
export type StateKey =
    // UI state
    | 'ui.showServerModal'
    | 'ui.serverModalMode'
    | 'ui.showEnvInfoModal'
    // Server table
    | 'servers.items'
    | 'servers.loading'
    | 'servers.error'
    | 'servers.menuId'
    // Server modal form fields
    | 'serverModal.name.value'
    | 'serverModal.name.error'
    | 'serverModal.transport.value'
    | 'serverModal.transport.error'
    | 'serverModal.command.value'
    | 'serverModal.command.error'
    | 'serverModal.url.value'
    | 'serverModal.url.error'
    | 'serverModal.args.value'
    | 'serverModal.args.error'
    | 'serverModal.enabled.value'
    | 'serverModal.enabled.error'
    | 'serverModal.description.value'
    | 'serverModal.description.error'
    | 'serverModal.validated';

/**
 * Initial application state structure
 * Matches the state keys defined in StateKey type
 */
export const initialState = {
    servers: {
        items: [],
        loading: true,
        error: '',
        menuId: '',
    },
    ui: {
        showServerModal: false,
        serverModalMode: 'create',
        showEnvInfoModal: false,
    },
    serverModal: {
        name: { value: '', error: '' },
        transport: { value: 'stdio', error: '' },
        command: { value: '', error: '' },
        url: { value: '', error: '' },
        args: { value: '', error: '' },
        enabled: { value: true, error: '' },
        description: { value: '', error: '' },
        validated: false,
    },
};
