import type { McpConfigApp } from '../app/main';
import type { JurisContext, JurisInstance, JurisVDOMElement } from '../types/juris';

type AppShellProps = {
    app: McpConfigApp;
};

/**
 * Main application shell with header, navigation, and footer
 * Wraps the main content area with persistent UI elements
 */
export function AppShell(_props: AppShellProps, _ctx: JurisContext): JurisVDOMElement {
    return {
        div: {
            children: [
                // Header with branding and theme toggle
                {
                    header: {
                        children: [
                            {
                                h1: {
                                    text: 'MCP Aggregator',
                                },
                            },
                            {
                                nav: {
                                    children: [
                                        {
                                            a: {
                                                href: '#servers',
                                                text: 'Servers',
                                            },
                                        },
                                        {
                                            a: {
                                                href: '#tools',
                                                text: 'Tools',
                                            },
                                        },
                                        {
                                            a: {
                                                href: '#resources',
                                                text: 'Resources',
                                            },
                                        },
                                    ],
                                },
                            },
                            {
                                div: {
                                    innerHTML: '<theme-toggle></theme-toggle>',
                                },
                            },
                        ],
                    },
                },

                // Main content area
                {
                    main: {
                        children: [{ McpConfigPage: {} }],
                    },
                },

                // Footer
                {
                    footer: {
                        children: [
                            {
                                div: {
                                    children: [
                                        { span: { text: 'MCP Aggregator • ' } },
                                        {
                                            a: {
                                                href: 'https://github.com/eram/mcp-agg',
                                                target: '_blank',
                                                rel: 'noopener noreferrer',
                                                text: 'GitHub',
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
 * Register AppShell component with Juris
 */
export function registerAppShell(juris: JurisInstance, app: McpConfigApp) {
    juris.registerComponent('AppShell', (props, ctx) => AppShell({ ...props, app }, ctx));
}
