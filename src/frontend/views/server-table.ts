/**
 * Server Table View
 * Displays list of MCP servers in a table using semantic HTML
 */

import type { MCPServerConfig } from '../../shared/types/mcp-config';
import { registerDropdownMenu } from '../components/dropdown-menu';
import { menuIcon, registerIcon } from '../components/icon';
import type { McpConfigApp } from '../main';
import type { JurisContext, JurisInstance, JurisVDOMElement } from '../types/juris';

type ServerTableProps = {
    app: McpConfigApp;
};

type ServerRowProps = {
    app: McpConfigApp;
    server: MCPServerConfig;
};

export function ServerTable(props: ServerTableProps, ctx: JurisContext): JurisVDOMElement {
    const loading = ctx.getState<boolean>('servers.loading', true);
    const error = ctx.getState<string>('servers.error', '');
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
                                        ServerRow: {
                                            server,
                                            app: props.app,
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
}

export function ServerRow(props: ServerRowProps, ctx: JurisContext): JurisVDOMElement {
    const { server, app } = props;

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
                                DropdownMenu: {
                                    id: `server-actions-${server.name}`,
                                    align: 'end',
                                    trigger: {
                                        Icon: {
                                            svg: menuIcon,
                                            ariaLabel: 'Server actions',
                                            title: 'Server actions',
                                        },
                                    },
                                    children: [
                                        {
                                            DropdownMenuItem: {
                                                text: 'Edit',
                                                onClick: () => {
                                                    ctx.setState('ui.serverModalMode', 'edit');
                                                    ctx.setState('ui.showServerModal', true);
                                                    ctx.setState('serverModal.name.value', server.name);
                                                    ctx.setState('serverModal.name.error', '');
                                                    ctx.setState('serverModal.transport.value', server.transport);
                                                    ctx.setState('serverModal.transport.error', '');
                                                    ctx.setState(
                                                        'serverModal.command.value',
                                                        server.transport === 'stdio' ? server.command : '',
                                                    );
                                                    ctx.setState('serverModal.command.error', '');
                                                    ctx.setState(
                                                        'serverModal.url.value',
                                                        server.transport !== 'stdio' ? server.url : '',
                                                    );
                                                    ctx.setState('serverModal.url.error', '');
                                                    ctx.setState(
                                                        'serverModal.args.value',
                                                        server.transport === 'stdio' && Array.isArray(server.args)
                                                            ? server.args.join(' ')
                                                            : '',
                                                    );
                                                    ctx.setState('serverModal.args.error', '');
                                                    ctx.setState('serverModal.enabled.value', server.enabled !== false);
                                                    ctx.setState('serverModal.enabled.error', '');
                                                    ctx.setState('serverModal.description.value', server.description || '');
                                                    ctx.setState('serverModal.description.error', '');
                                                    ctx.setState('serverModal.validated', false);
                                                    app.render();
                                                },
                                            },
                                        },
                                        {
                                            DropdownMenuItem: {
                                                text: 'Duplicate',
                                                onClick: () => {
                                                    ctx.setState('ui.serverModalMode', 'add');
                                                    ctx.setState('ui.showServerModal', true);
                                                    ctx.setState('serverModal.name.value', `${server.name}-copy`);
                                                    ctx.setState('serverModal.name.error', '');
                                                    ctx.setState('serverModal.transport.value', server.transport);
                                                    ctx.setState('serverModal.transport.error', '');
                                                    ctx.setState(
                                                        'serverModal.command.value',
                                                        server.transport === 'stdio' ? server.command : '',
                                                    );
                                                    ctx.setState('serverModal.command.error', '');
                                                    ctx.setState(
                                                        'serverModal.url.value',
                                                        server.transport !== 'stdio' ? server.url : '',
                                                    );
                                                    ctx.setState('serverModal.url.error', '');
                                                    ctx.setState(
                                                        'serverModal.args.value',
                                                        server.transport === 'stdio' && Array.isArray(server.args)
                                                            ? server.args.join(' ')
                                                            : '',
                                                    );
                                                    ctx.setState('serverModal.args.error', '');
                                                    ctx.setState('serverModal.enabled.value', server.enabled !== false);
                                                    ctx.setState('serverModal.enabled.error', '');
                                                    ctx.setState('serverModal.description.value', server.description || '');
                                                    ctx.setState('serverModal.description.error', '');
                                                    ctx.setState('serverModal.validated', false);
                                                    app.render();
                                                },
                                            },
                                        },
                                        {
                                            DropdownMenuSeparator: {},
                                        },
                                        {
                                            DropdownMenuItem: {
                                                text: server.enabled === false ? 'Enable' : 'Disable',
                                                onClick: async () => {
                                                    await app.enableServer(server.name, server.enabled !== false);
                                                    ctx.setState('servers.menuId', '');
                                                },
                                            },
                                        },
                                        {
                                            DropdownMenuSeparator: {},
                                        },
                                        {
                                            DropdownMenuItem: {
                                                text: 'Delete',
                                                onClick: async () => {
                                                    if (confirm(`Are you sure you want to delete "${server.name}"?`)) {
                                                        await app.deleteServer(server.name);
                                                        ctx.setState('servers.menuId', '');
                                                    }
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                },
            ],
        },
    };
}

/**
 * Register ServerTable and ServerRow components with Juris
 */
export function registerServerTable(juris: JurisInstance, app: McpConfigApp) {
    registerDropdownMenu(juris);
    registerIcon(juris);
    juris.registerComponent('ServerTable', (props, ctx) => ServerTable({ ...props, app }, ctx));
    juris.registerComponent('ServerRow', (props, ctx) => ServerRow({ ...(props as { server: MCPServerConfig }), app }, ctx));
}
