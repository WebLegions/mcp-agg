/**
 * MCP Configuration App - Main Entry Point
 * JurisJS application for managing MCP server configurations
 */

import { ApiClient } from '../shared/libs/api-client';
import { Env } from '../shared/utils/env';
import { ErrorEx } from '../shared/utils/error';
import { ConfigService } from './services/config-service';
import { initialState } from './state';
import type { JurisConfig, JurisContext, ReactiveValue, RouterAPI } from './types/juris';
import type { JurisVDOMElement as BaseJurisVDOMElement } from './types/juris/juris.d';
import { registerAppShell } from './views/app-shell';

// ============================================================================
// Application Component Type System
// ============================================================================

/**
 * App namespace for application-specific component type definitions.
 * This provides better type inference and F12 navigation compared to Juris.RegisteredComponents.
 *
 * Components register their prop types here via declaration merging:
 * ```typescript
 * // In your component file:
 * declare global {
 *     namespace App {
 *         interface Components {
 *             myComponent: MyComponentProps;
 *         }
 *     }
 * }
 * ```
 */
declare global {
    namespace App {
        /**
         * Application components registry.
         * Components register their prop types here via declaration merging.
         */
        interface Components {}
    }
}

/**
 * VDOM Element type that uses App.Components instead of Juris.RegisteredComponents.
 * This provides better type inference for deeply nested component usage.
 *
 * The key difference from JurisVDOMElement:
 * - Uses App.Components namespace (application-specific)
 * - Better type inference in nested structures
 * - F12 navigation works on deeply nested components
 */
export type AppVDOMElement =
    | (keyof App.Components extends never
          ? never
          : {
                [K in keyof App.Components]: {
                    [P in K]: App.Components[K] & {
                        children?: ReactiveValue<AppVDOMElement[]>;
                        key?: string | number;
                    };
                };
            }[keyof App.Components])
    | BaseJurisVDOMElement;

// ============================================================================
// Application Context Type
// ============================================================================

export type AppState = typeof initialState;
/**
 * This is the flow from headless service to context:
 * 1. main.ts registers headless (Router) or service (ApiClient).
 * 2. HeadlessManager initializes Router and gets the api object.
 * 3. HeadlessManager assigns juris.headlessAPIs.router = api.
 * 4. Juris creates the context for a component: ctx = { ...state, ...headlessAPIs, ...services }.
 * 5. The component receives ctx.router or ctx.apiClient.
 */

export interface AppContext extends JurisContext<AppState> {
    api: ApiClient;
    router: RouterAPI;
    config: ConfigService;

    // clean some Juris types to make code consistant
    services: never;
    headless: never;
    headlessAPIs: never;
}

/**
 * Component function type for this application
 *
 * Uses AppVDOMElement as return type for better type inference on nested components.
 * AppVDOMElement uses App.Components namespace instead of Juris.RegisteredComponents.
 */
export type AppComponent<P = Record<string, unknown>> = (
    props: P,
    context: AppContext,
) => AppVDOMElement | { render: () => AppVDOMElement };

/**
 * Type assertion helper for AppVDOMElement.
 * Note: This doesn't improve hover/F12 for nested components due to TypeScript limitations.
 *
 * Example:
 * ```typescript
 * const myComp = vdom({
 *     div: {
 *         p: 'hello'
 *     }
 * });
 * ```
 */
export const vdom = <T extends AppVDOMElement>(element: T): AppVDOMElement => element;

/**
 * Type-safe component creator helper.
 * Provides better F12 navigation and hover types for registered components.
 *
 * Use this to create component elements with full type inference:
 * ```typescript
 * children: [
 *     v('icon', {
 *         image: myIcon,
 *         ariaLabel: 'test',  // ← F12 and hover work!
 *     }),
 *     v('themeSwitch', {})
 * ]
 * ```
 */
export const v = <K extends keyof App.Components>(name: K, props: App.Components[K]): AppVDOMElement =>
    ({ [name]: props }) as AppVDOMElement;

// ============================================================================
// Main Application Class
// ============================================================================

export class App extends Juris {
    constructor() {
        Env.print();
        const isDev = Env.get('NODE_ENV', 'production') === 'development';

        // Check if required globals are loaded
        if (!Juris || !Router || !HeadlessManager || !CSSExtractor) {
            const check = {
                Juris: typeof Juris,
                Router: typeof Router,
                HeadlessManager: typeof HeadlessManager,
                CSSExtractor: typeof CSSExtractor,
            };
            throw new ErrorEx(`Juris library not loaded. Make sure juris.js is loaded before main.ts\n${JSON.stringify(check)}`);
        }

        // Initialize API client with base URL
        // Default: same-origin absolute URL for development/production
        // Optional override on development: set the API on query string `?apiBase=https://api.example.com`
        let apiBase = `${window.location.origin}/api/v1/`;
        if (Env.nodeEnv === 'development') {
            const sp = new URLSearchParams(window.location.search);
            const override = sp.get('apiBase');
            if (override) {
                // User provided full URL for cross-origin API
                apiBase = override.endsWith('/') ? override : `${override}/`;
            }
        }

        super({
            features: {
                cssExtractor: CSSExtractor,
                headless: HeadlessManager,
            },
            logLevel: Env.get('C_LOG_LEVEL', isDev ? 'info' : 'error') as JurisConfig['logLevel'],
            states: initialState,
            // services with no context
            services: {
                api: new ApiClient(apiBase),
            },
        });

        // NB! For unknown reason the HeadlessManager is not initilized durign ctor.
        // We need to initilaize it here, then register the headless components,
        // then we can set a layout and render it manually.
        const headlessManager: typeof HeadlessManager = Object(this).headlessManager;
        if (headlessManager && typeof headlessManager.register === 'function') {
            console.log('Registering headless components...');

            headlessManager.register('router', Router, { autoInit: true, mode: 'history' });

            headlessManager.register('config', ConfigService.headless, { autoInit: true });
            headlessManager.initializeQueued();

            console.log(`Router API: ${Object.keys(headlessManager.getAPI('router') ?? {}).length} functions.`);
            console.log(`Config API: ${Object.keys(headlessManager.getAPI('config') ?? {}).length} functions.`);
        } else {
            console.error('Cannot register headless components - register method not available');
        }

        registerAppShell(this);
        Object(this).layout = { appShell: {} };
        this.render('#app');
    }
}

// Extend Window interface to include our app instance
declare global {
    interface Window {
        mcpApp: App;
    }
}

// Initialize the app when the page loads
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        window.mcpApp = new App();
    });
}
