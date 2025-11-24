/**
 * Server Table View
 * Displays list of MCP servers in a table using semantic HTML
 */

import type { MCPServerConfig } from '../../shared/types/mcp-config';
import { type MenuItem, menu } from '../components/dropdown-menu';
import { menuIcon } from '../components/icon';
import type { App, AppComponent, AppVDOMElement } from '../main';

export const serverTable: AppComponent = (_props, ctx): AppVDOMElement => {
    const loading = ctx.getState('servers.loading', true);
    const error = ctx.getState('servers.error', '');
    const servers = ctx.getState<MCPServerConfig[]>('servers.items', []);

    if (loading) {
        return {
            div: {
                children: [
                    {
                        p: {
                            text: 'Loading servers...',
                        },
                    },
                ],
            },
        };
    }

    if (error) {
        return {
            div: {
                children: [
                    {
                        p: {
                            text: `Error: ${error}`,
                            style: 'color: red;',
                        },
                    },
                ],
            },
        };
    }

    if (servers.length === 0) {
        return {
            div: {
                children: [
                    {
                        p: {
                            text: 'No servers configured. Click "Add Server" to create your first MCP server configuration.',
                        },
                    },
                ],
            },
        };
    }

    return {
        div: {
            children: [
                {
                    table: {
                        children: [
                            {
                                thead: {
                                    children: [
                                        {
                                            tr: {
                                                children: [
                                                    { th: { text: 'NAME' } },
                                                    { th: { text: 'STATUS' } },
                                                    { th: { text: 'TRANSPORT' } },
                                                    { th: { text: 'COMMAND/URL' } },
                                                    { th: { text: 'DESCRIPTION' } },
                                                    { th: { text: 'ACTIONS' } },
                                                ],
                                            },
                                        },
                                    ],
                                },
                            },
                            {
                                tbody: {
                                    children: servers.map((server: MCPServerConfig) => ({
                                        serverRow: {
                                            server,
                                        },
                                    })),
                                },
                            },
                        ],
                    },
                },
            ],
        },
    };
};

export const serverRow: AppComponent<{ server: MCPServerConfig }> = (props, ctx): AppVDOMElement => {
    const { server } = props;

    let commandOrUrl = '';
    if (server.transport === 'stdio') {
        commandOrUrl = server.command || '';
        if (server.args && Array.isArray(server.args) && server.args.length > 0) {
            commandOrUrl += ` ${server.args.join(' ')}`;
        }
    } else {
        commandOrUrl = server.url || '';
    }

    const statusText = server.enabled === false ? '✗ Disabled' : '✓ Enabled';

    const openServerModal = (mode: 'edit' | 'add', name: string) => {
        ctx.setState('ui.serverModalMode', mode);
        ctx.setState('ui.showServerModal', true);
        ctx.setState('serverModal.name.value', name);
        ctx.setState('serverModal.name.error', '');
        ctx.setState('serverModal.transport.value', server.transport);
        ctx.setState('serverModal.transport.error', '');
        ctx.setState('serverModal.command.value', server.transport === 'stdio' ? server.command : '');
        ctx.setState('serverModal.command.error', '');
        ctx.setState('serverModal.url.value', server.transport !== 'stdio' ? server.url : '');
        ctx.setState('serverModal.url.error', '');
        ctx.setState(
            'serverModal.args.value',
            server.transport === 'stdio' && Array.isArray(server.args) ? server.args.join(' ') : '',
        );
        ctx.setState('serverModal.args.error', '');
        ctx.setState('serverModal.enabled.value', server.enabled !== false);
        ctx.setState('serverModal.enabled.error', '');
        ctx.setState('serverModal.description.value', server.description || '');
        ctx.setState('serverModal.description.error', '');
        ctx.setState('serverModal.validated', false);
    };

    const handleEdit = () => openServerModal('edit', server.name);

    const handleToggleEnabled = async () => {
        await ctx.config.enableServer(server.name, server.enabled !== false);
        ctx.setState('servers.menuId', '');
    };

    const handleDelete = async () => {
        if (confirm(`Are you sure you want to delete "${server.name}"?`)) {
            await ctx.config.deleteServer(server.name);
            ctx.setState('servers.menuId', '');
        }
    };

    const menuItems: MenuItem[] = [
        {
            type: 'item',
            text: 'Edit',
            onClick: handleEdit,
        },
        {
            type: 'item',
            text: server.enabled === false ? 'Enable' : 'Disable',
            onClick: handleToggleEnabled,
        },
        {
            type: 'separator',
        },
        {
            type: 'item',
            text: 'Delete',
            onClick: handleDelete,
        },
    ];

    return {
        tr: {
            id: `server-row-${server.name}`,
            children: [
                {
                    td: {
                        children: [{ strong: { text: server.name } }],
                    },
                },
                {
                    td: {
                        children: [
                            {
                                span: {
                                    text: statusText,
                                },
                            },
                        ],
                    },
                },
                {
                    td: {
                        children: [
                            {
                                code: {
                                    text: server.transport.toUpperCase(),
                                },
                            },
                        ],
                    },
                },
                {
                    td: {
                        children: [{ code: { text: commandOrUrl } }],
                    },
                },
                {
                    td: {
                        text: server.description || '-',
                    },
                },
                {
                    td: {
                        children: [
                            {
                                menu: {
                                    id: `server-actions-${server.name}`,
                                    align: 'end',
                                    trigger: {
                                        icon: {
                                            image: menuIcon,
                                            ariaLabel: 'Server actions',
                                            title: 'Server actions',
                                        },
                                    },
                                    items: menuItems,
                                },
                            },
                        ],
                    },
                },
            ],
        },
    };
};

/**
 * Register serverTable and serverRow components with App
 */
export function registerServerTable(app: App) {
    app.registerComponent('menu', menu as never);
    app.registerComponent('serverTable', serverTable as never);
    app.registerComponent('serverRow', serverRow as never);
}
