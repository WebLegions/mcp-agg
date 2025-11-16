/**
 * Server Table View
 * Displays list of MCP servers in a table using semantic HTML
 */

import type { MCPServerConfig } from '../../shared/types/mcp-config';
import type { McpConfigApp } from '../app/main';
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
    const error = ctx.getState<string | null>('servers.error');
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
    const openMenuId = ctx.getState<string | null>('ui.openMenuId');
    const isMenuOpen = openMenuId === server.name;

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

    const menuChildren: JurisVDOMElement[] = [
        {
            button: {
                type: 'button',
                text: '⋮',
                style: 'cursor: pointer; padding: 4px 8px; font-size: 18px;',
                onClick: (e: Event) => {
                    e.stopPropagation();
                    ctx.setState('ui.openMenuId', isMenuOpen ? null : server.name);
                    setTimeout(() => app.render(), 0);
                },
            },
        },
    ];

    if (isMenuOpen) {
        menuChildren.push({
            div: {
                style: `
                    position: absolute;
                    right: 0;
                    top: 100%;
                    background: var(--bg, #fff);
                    border: 1px solid var(--border, #ccc);
                    border-radius: 4px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    padding: 4px;
                    z-index: 100;
                    min-width: 140px;
                `,
                children: [
                    {
                        button: {
                            type: 'button',
                            text: server.enabled === false ? '✓ Enable' : '✕ Disable',
                            style: `
                                display: block;
                                width: 100%;
                                text-align: left;
                                padding: 8px 12px;
                                border: none;
                                background: transparent;
                                cursor: pointer;
                            `,
                            onMouseOver: (e: Event) => {
                                (e.target as HTMLElement).style.background = 'var(--hover-bg, #f0f0f0)';
                            },
                            onMouseOut: (e: Event) => {
                                (e.target as HTMLElement).style.background = 'transparent';
                            },
                            onClick: async (e: Event) => {
                                e.stopPropagation();
                                ctx.setState('ui.openMenuId', null);
                                await app.enableServer(server.name, server.enabled !== false);
                            },
                        },
                    },
                    {
                        button: {
                            type: 'button',
                            text: '✎ Edit',
                            style: `
                                display: block;
                                width: 100%;
                                text-align: left;
                                padding: 8px 12px;
                                border: none;
                                background: transparent;
                                cursor: pointer;
                            `,
                            onMouseOver: (e: Event) => {
                                (e.target as HTMLElement).style.background = 'var(--hover-bg, #f0f0f0)';
                            },
                            onMouseOut: (e: Event) => {
                                (e.target as HTMLElement).style.background = 'transparent';
                            },
                            onClick: (e: Event) => {
                                e.stopPropagation();
                                ctx.setState('ui.serverModalMode', 'edit');
                                ctx.setState('ui.showServerModal', true);
                                ctx.setState('ui.openMenuId', null);
                                ctx.setState('serverModal.name', server.name);
                                ctx.setState('serverModal.transport', server.transport);
                                ctx.setState('serverModal.command', server.transport === 'stdio' ? server.command : '');
                                ctx.setState('serverModal.url', server.transport !== 'stdio' ? server.url : '');
                                ctx.setState(
                                    'serverModal.args',
                                    server.transport === 'stdio' && Array.isArray(server.args) ? server.args.join(' ') : '',
                                );
                                ctx.setState('serverModal.enabled', server.enabled !== false);
                                ctx.setState('serverModal.description', server.description || '');
                                setTimeout(() => app.render(), 0);
                            },
                        },
                    },
                    {
                        button: {
                            type: 'button',
                            text: '🗑 Delete',
                            style: `
                                display: block;
                                width: 100%;
                                text-align: left;
                                padding: 8px 12px;
                                border: none;
                                background: transparent;
                                cursor: pointer;
                                color: var(--danger, #d32f2f);
                            `,
                            onMouseOver: (e: Event) => {
                                (e.target as HTMLElement).style.background = 'var(--hover-bg, #f0f0f0)';
                            },
                            onMouseOut: (e: Event) => {
                                (e.target as HTMLElement).style.background = 'transparent';
                            },
                            onClick: async (e: Event) => {
                                e.stopPropagation();
                                ctx.setState('ui.openMenuId', null);
                                await app.deleteServer(server.name);
                            },
                        },
                    },
                ],
            },
        });
    }

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
                        style: 'position: relative;',
                        children: menuChildren,
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
    juris.registerComponent('ServerTable', (props, ctx) => ServerTable({ ...props, app }, ctx));
    juris.registerComponent('ServerRow', (props, ctx) => ServerRow({ ...(props as { server: MCPServerConfig }), app }, ctx));
}
