/**
 * MCP Configuration Page View
 * Main page view using classless CSS semantic HTML
 */

import type { MCPServerConfig } from '../../shared/types/mcp-config';
import { slugify } from '../../shared/utils/text';
import { menuIcon } from '../components/icon';
import type { MenuItem } from '../components/menu';
import type { j } from '../main';

export const configPage: j.Component = (_props, ctx) => {
    const openServerModal = (mode: 'edit' | 'add') => {
        const server: MCPServerConfig = ctx.getState('servers.menuId');
        ctx.setState('servers.menuId', '');
        ctx.setState('ui.serverModalMode', mode);
        ctx.setState('ui.showServerModal', true);
        ctx.setState('serverModal.name.value', server.name);
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

    const handleEdit = () => openServerModal('edit');

    const handleToggleEnabled = async () => {
        const server: MCPServerConfig = ctx.getState('servers.menuId');
        const currentEnabled = server.enabled !== false; // undefined or true → enabled
        const newEnabled = !currentEnabled; // Toggle the state
        ctx.setState('servers.menuId', '');
        await ctx.config.update(server.name, { enabled: newEnabled });
    };

    const handleDelete = async () => {
        const server: MCPServerConfig = ctx.getState('servers.menuId');
        if (confirm(`Are you sure you want to delete "${server.name}"?`)) {
            ctx.setState('servers.menuId', '');
            await ctx.config.delete(server.name);
        }
    };

    const menuItems = (server: MCPServerConfig): MenuItem[] =>
        [
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
        ] as const;

    return {
        div: {
            children: [
                {
                    main: {
                        children: [
                            {
                                header: {
                                    children: [
                                        {
                                            h1: {
                                                text: '🔧 MCP Aggregator Configuration',
                                            },
                                        },
                                    ],
                                },
                            },
                            {
                                section: {
                                    children: () => {
                                        const servers = ctx.getState<MCPServerConfig[]>('servers.items', []);
                                        const total = servers.length;
                                        const enabled = servers.filter((s) => s.enabled).length;
                                        const disabled = total - enabled;

                                        return [
                                            {
                                                p: {
                                                    style: {
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                    },
                                                    children: [
                                                        {
                                                            span: {
                                                                children: [
                                                                    { span: { text: `Total: ${total} • ` } },
                                                                    { span: { text: `Enabled: ${enabled} • ` } },
                                                                    { span: { text: `Disabled: ${disabled}` } },
                                                                ],
                                                            },
                                                        },
                                                        {
                                                            button: {
                                                                id: 'config-page-add-server-button',
                                                                text: '+ Add Server',
                                                                onClick: () => {
                                                                    ctx.setState('ui.serverModalMode', 'create');
                                                                    ctx.setState('ui.showServerModal', true);
                                                                    ctx.setState('serverModal.name.value', '');
                                                                    ctx.setState('serverModal.name.error', '');
                                                                    ctx.setState('serverModal.transport.value', 'stdio');
                                                                    ctx.setState('serverModal.transport.error', '');
                                                                    ctx.setState('serverModal.command.value', '');
                                                                    ctx.setState('serverModal.command.error', '');
                                                                    ctx.setState('serverModal.url.value', '');
                                                                    ctx.setState('serverModal.url.error', '');
                                                                    ctx.setState('serverModal.args.value', '');
                                                                    ctx.setState('serverModal.args.error', '');
                                                                    ctx.setState('serverModal.enabled.value', true);
                                                                    ctx.setState('serverModal.enabled.error', '');
                                                                    ctx.setState('serverModal.description.value', '');
                                                                    ctx.setState('serverModal.description.error', '');
                                                                    ctx.setState('serverModal.validated', false);
                                                                },
                                                            },
                                                        },
                                                    ],
                                                },
                                            },
                                        ];
                                    },
                                },
                            },
                            () =>
                                ctx.getState('servers.loading', true) && {
                                    p: {
                                        text: 'Loading servers...',
                                    },
                                },

                            () =>
                                ctx.getState('servers.error', '') !== '' && {
                                    p: {
                                        text: `Error: ${ctx.getState('servers.error', '')}`,
                                        style: { color: 'var(--danger, red)' },
                                    },
                                },

                            () =>
                                !ctx.getState('servers.loading', true) &&
                                ctx.getState('servers.items', []).length === 0 && {
                                    p: {
                                        text: 'No servers configured. Click "Add Server" to create your first MCP server configuration.',
                                    },
                                },

                            () =>
                                ctx.getState('servers.items', []).length > 0 && {
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
                                                    children: ctx
                                                        .getState<MCPServerConfig[]>('servers.items', [])
                                                        .map((server: MCPServerConfig) => ({
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
                },
                { serverModal: {} },
                // Menu
                () => {
                    const server: MCPServerConfig = ctx.getState('servers.menuId');
                    return (
                        !!server && {
                            menu: {
                                slug: slugify('server-menu', server.name),
                                align: 'end',
                                items: menuItems(server),
                                xy: ctx.getState('servers.menuXY'),
                                onEscape: () => {
                                    ctx.setState('servers.menuId', '');
                                },
                            },
                        }
                    );
                },
            ],
        },
    }; // return
};

export const serverRow: j.Component<{ server: MCPServerConfig }> = (props, ctx): j.Elem => {
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

    return {
        tr: {
            id: slugify('server-row', server.name),
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
                                icon: {
                                    image: menuIcon,
                                    ariaLabel: 'Server actions',
                                    title: 'Server actions',
                                    onClick: (event: MouseEvent | KeyboardEvent) => {
                                        console.log(event instanceof MouseEvent, event);

                                        if (event instanceof KeyboardEvent) {
                                            const active = document.activeElement;
                                            const rect = active?.getBoundingClientRect();
                                            if (rect) {
                                                ctx.setState('servers.menuXY', { x: rect.left, y: rect.bottom });
                                            }
                                        } else {
                                            // mouse click
                                            ctx.setState('servers.menuXY', { x: event.clientX, y: event.clientY });
                                        }

                                        if (ctx.getState('servers.menuId') === server) {
                                            ctx.setState('servers.menuId', '');
                                        } else {
                                            ctx.setState('servers.menuId', server);
                                        }
                                    },
                                },
                            },
                        ],
                    },
                },
            ],
        },
    };
};
