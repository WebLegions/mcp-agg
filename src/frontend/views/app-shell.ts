import { ErrorEx } from '../../shared/utils/error';
import { icon, infoIcon } from '../components/icon';
import { menu } from '../components/menu';
import { modal } from '../components/modal';
import { type NavRoute, navBar } from '../components/nav-bar';
import { themeToggle } from '../components/theme-toggle';
import type { j } from '../main';
import { configPage, serverRow } from './config-page';
import { envModal } from './env-modal';
import { healthPage } from './health-page';
import { serverModal } from './server-modal';
import { swaggerPage } from './swagger-page';

/**
 * Shared route configuration
 * Single source of truth for both router and navigation
 */
interface RouteConfig extends NavRoute {
    component: string;
}

const APP_ROUTES: RouteConfig[] = [
    { path: '/', label: 'MCP Config', component: 'configPage' },
    { path: '/health', label: 'Health', component: 'healthPage' },
    { path: '/swagger', label: 'Swagger', component: 'swaggerPage' },
];

/**
 * Main application shell with header, navigation, and footer
 * Wraps the main content area with persistent UI elements
 * Handles router initialization and app bootstrap
 */
export const appShell: j.Component = (_props, ctx) => {
    // Access router and config
    const router = ctx.router;
    const config = ctx.config;

    // Validate that headless components are available
    if (!router) {
        throw new ErrorEx('ctx.router is required');
    }
    if (!config?.find) {
        console.error('Config not available. config:', config);
        throw new ErrorEx('ctx.config is required');
    }

    // Initialize router routes and load config (only once)
    if (!Object.keys(router.getConfig().routes ?? {}).length) {
        // Add routes to the router
        APP_ROUTES.forEach((route) => {
            router.addRoute(route.path, { component: route.component });
        });

        // Load initial server configuration
        config.find().catch(console.error);
    }

    return {
        div: {
            children: [
                // Navigation Bar
                { navBar: { routes: APP_ROUTES } },

                // Main content area
                {
                    main: {
                        children: () => {
                            // Get current path from router state for reactivity
                            const currentPath = ctx.getState('url.path', '/');
                            const match = router.matchRoute(currentPath);
                            const name = String(match?.route?.component ?? 'configPage');
                            return [{ [name]: {} }];
                        },
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
                                                style: {
                                                    color: 'var(--primary-color)',
                                                    textDecoration: 'none',
                                                },
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
                                icon: {
                                    image: infoIcon,
                                    onClick: () => ctx.setState('ui.showEnvModal', true),
                                    ariaLabel: 'Show environment information',
                                    title: 'Environment Info',
                                },
                            },
                            { themeToggle: {} },
                        ],
                    },
                },
                { envModal: { stateKey: 'ui.showEnvModal' } },
            ],
        },
    };
};

/**
 * Register AppShell and all required components with App
 * Consolidates all component registration in one place
 */
export function registerAppShell(app: j.App) {
    const reg = [
        icon,
        modal,
        menu,
        serverRow,
        envModal,
        navBar,
        appShell,
        themeToggle,
        serverModal,
        configPage,
        healthPage,
        swaggerPage,
    ];
    for (const component of reg) {
        app.registerComponent(component.name, component as never);
    }
}
