/**
 * Centralized application state structure
 */

export const initialState = {
    servers: {
        items: [],
        loading: true,
        error: '',
        menuId: '',
    },
    ui: {
        showEnvModal: false, // 'ui.showEnvModal'
        showServerModal: false, // 'ui.showServerModal'
        serverModalMode: 'create', // 'ui.serverModalMode'
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
        mode: 'create',
    },
};
