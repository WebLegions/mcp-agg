/**
 * MCP Configuration App - Main Entry Point
 * JurisJS application for managing MCP server configurations
 */

import { ApiClient } from '../shared/libs/api-client';
import { Env } from '../shared/utils/env';
import { ErrorEx } from '../shared/utils/error';
import { ConfigClient } from './services/config-client';
import { APP_STATE } from './state';
import type * as JurisTypes from './types/juris';
import { registerAppShell } from './views/app-shell';

// Application context with our services
interface AppContext extends Omit<JurisTypes.JurisContext<typeof APP_STATE>, 'getState'> {
    api: ApiClient;
    router: JurisTypes.RouterAPI;
    config: ConfigClient;

    // better typing for getState
    getState: {
        (path: string, defaultValue: string, track?: boolean): string;
        (path: string, defaultValue: number, track?: boolean): number;
        (path: string, defaultValue: boolean, track?: boolean): boolean;
        (path: string, defaultValue: bigint, track?: boolean): bigint;
        <T>(path: string, defaultValue?: T, track?: boolean): T;
    };

    juris: AppClass;

    // using these from context is an anti-pattern. use getXx instead.
    services: never;
    headless: never;
    headlessAPIs: never;
}

export class AppClass extends Juris<typeof APP_STATE> {
    // Hide getState and setState from public API - use context.getState/setState instead
    declare getState: never;
    declare setState: never;

    constructor(mountTag: string) {
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
            logLevel: Env.get('C_LOG_LEVEL', isDev ? 'info' : 'error'),
            states: APP_STATE,
            // services with no context
            services: {
                api: new ApiClient(apiBase),
            },
        });

        // NB! For unknown reason the HeadlessManager is not initialized during ctor.
        // We need to initialize it here, then register the headless components,
        // then we can set a layout and render it manually.
        const headlessManager: typeof HeadlessManager = Object(this).headlessManager;
        if (headlessManager && typeof headlessManager.register === 'function') {
            console.log('Registering headless components...');

            headlessManager.register('router', Router, { autoInit: true, mode: 'history' });

            headlessManager.register('config', ConfigClient.headless, { autoInit: true });
            headlessManager.initializeQueued();

            console.log(`Router API: ${Object.keys(headlessManager.getAPI('router') ?? {}).length} functions.`);
            console.log(`Config API: ${Object.keys(headlessManager.getAPI('config') ?? {}).length} functions.`);
        } else {
            console.error('HeadlessManager: register method not available');
        }

        registerAppShell(this);
        Object(this).layout = { appShell: {} };
        this.render(mountTag);
    }
}

// Unified namespace for all application exports
export namespace j {
    export type Component<P = Record<string, unknown>> = (
        props: P,
        ctx: j.Context,
    ) => JurisTypes.JurisVDOMElement | { render: () => JurisTypes.JurisVDOMElement };
    export type Style = JurisTypes.StyleValue;
    export type Elem = JurisTypes.JurisVDOMElement;
    export type ReactiveValue<T> = JurisTypes.ReactiveValue<T>;

    export type State = typeof APP_STATE;
    export type Context = AppContext;
    export type App = AppClass;

    // Re-export all Juris types under j.juris namespace
    export namespace juris {
        export type ArmedInstance = JurisTypes.ArmedInstance;
        export type CSSExtractor = JurisTypes.CSSExtractor;
        export type ExtendedStyleObject = JurisTypes.ExtendedStyleObject;
        export type HeadlessComponent<T = unknown> = JurisTypes.HeadlessComponent<T>;
        export type HeadlessComponentFunction<T = unknown> = JurisTypes.HeadlessComponentFunction<T>;
        export type HeadlessManager = JurisTypes.HeadlessManager;
        export type JurisConstructor = JurisTypes.JurisConstructor;
        export type JurisContext<TState = Record<string, unknown>> = JurisTypes.JurisContext<TState>;
        export type JurisInputElement = JurisTypes.JurisInputElement;
        export type JurisInstance<TState = Record<string, unknown>> = JurisTypes.JurisInstance<TState>;
        export type JurisVDOMElement = JurisTypes.JurisVDOMElement;
        export type ParsedURL = JurisTypes.ParsedURL;
        export type ReactiveValue<T> = JurisTypes.ReactiveValue<T>;
        export type RouteConfig = JurisTypes.RouteConfig;
        export type RouteGuard = JurisTypes.RouteGuard;
        export type RouteMatch = JurisTypes.RouteMatch;
        export type RouterAPI = JurisTypes.RouterAPI;
        export type RouterConfig = JurisTypes.RouterConfig;
        export type SVGProperties = JurisTypes.SVGProperties;
    }
}

// Initialize the app when the page loads
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        new AppClass('#app');
    });
}
