import { infoIcon, registerIcon } from '../components/icon';
import type { McpConfigApp } from '../main';
import type { JurisContext, JurisInstance, JurisVDOMElement } from '../types/juris';
import { registerEnvInfoModal } from './env-info-modal';

type AppShellProps = {
    app: McpConfigApp;
};

/**
 * Main application shell with header, navigation, and footer
 * Wraps the main content area with persistent UI elements
 */
export function AppShell(_props: AppShellProps, ctx: JurisContext): JurisVDOMElement {
    return {
        div: {
            children: [
                // Header with navigation
                {
                    header: {
                        children: [
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

                // floating bottom right
                {
                    div: {
                        className: 'bottom-right-controls',
                        style: {
                            position: 'fixed',
                            right: '1.5rem',
                            bottom: '1.5rem',
                            zIndex: '1000',
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: '0.5rem',
                        },
                        children: [
                            {
                                Icon: {
                                    svg: infoIcon,
                                    onClick: () => ctx.setState('ui.showEnvInfoModal', true),
                                    ariaLabel: 'Show environment information',
                                    title: 'Environment Info',
                                },
                            },
                            { ThemeSwitch: {} },
                        ],
                    },
                },
                { EnvInfoModal: { stateKey: 'ui.showEnvInfoModal' } },
            ],
        },
    };
}

/**
 * Register AppShell component with Juris
 */
export function registerAppShell(juris: JurisInstance, app: McpConfigApp) {
    registerIcon(juris);
    registerEnvInfoModal(juris);
    juris.registerComponent('AppShell', (props, ctx) => AppShell({ ...props, app }, ctx));
}
