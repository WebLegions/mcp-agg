/**
 * MCP Configuration Page View
 * Main page view using classless CSS semantic HTML
 */

import type { MCPServerConfig } from '../../shared/types/mcp-config';
import type { AppComponent } from '../main';

export const configPage: AppComponent = (_props, ctx) => {
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
                                                nav: {
                                                    children: [
                                                        {
                                                            p: {
                                                                children: [
                                                                    { span: { text: `Total: ${total} • ` } },
                                                                    { span: { text: `Enabled: ${enabled} • ` } },
                                                                    { span: { text: `Disabled: ${disabled}` } },
                                                                ],
                                                            },
                                                        },
                                                        {
                                                            button: {
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
                            {
                                section: {
                                    children: [{ serverTable: {} }],
                                },
                            },
                        ],
                    },
                },
                {
                    serverModal: {},
                },
            ],
        },
    };
};
