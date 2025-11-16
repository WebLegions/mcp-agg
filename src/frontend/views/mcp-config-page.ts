/**
 * MCP Configuration Page View
 * Main page view using classless CSS semantic HTML
 */

import type { MCPServerConfig } from '../../shared/types/mcp-config';
import type { McpConfigApp } from '../app/main';
import type { JurisContext, JurisInstance, JurisVDOM, JurisVDOMElement } from '../types/juris';

type McpConfigPageProps = {
    app: McpConfigApp;
};

export function McpConfigPage(props: McpConfigPageProps, ctx: JurisContext): JurisVDOMElement {
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
                                        {
                                            p: {
                                                text: 'Manage your Model Context Protocol servers',
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
                                                                    ctx.setState('serverModal.name', '');
                                                                    ctx.setState('serverModal.transport', 'stdio');
                                                                    ctx.setState('serverModal.command', '');
                                                                    ctx.setState('serverModal.url', '');
                                                                    ctx.setState('serverModal.args', '');
                                                                    ctx.setState('serverModal.enabled', true);
                                                                    ctx.setState('serverModal.description', '');
                                                                    setTimeout(() => props.app.render(), 0);
                                                                },
                                                            },
                                                        },
                                                    ] as JurisVDOM.Element[],
                                                },
                                            },
                                        ] as JurisVDOM.Element[];
                                    },
                                },
                            },
                            {
                                section: {
                                    children: [{ ServerTable: {} }],
                                },
                            },
                        ],
                    },
                },
                {
                    ServerModal: {},
                },
            ],
        },
    };
}

/**
 * Register McpConfigPage component with Juris
 */
export function registerMcpConfigPage(juris: JurisInstance, app: McpConfigApp) {
    juris.registerComponent('McpConfigPage', (props, ctx) => McpConfigPage({ ...props, app }, ctx));
}
