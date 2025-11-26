/**
 * Juris Type Definitions
 * Re-exports base JurisJS types from juris.d.ts
 */

// Re-export all base Juris types
export * from './juris.d';

// Extended types that need to be available for re-export
import type {
    JurisInstance as BaseJurisInstance,
    JurisVDOMElement as BaseJurisVDOMElement,
    StyleValue as BaseStyleValue,
} from './juris.d';

/**
 * Enhanced VDOM element with registered components first for better
 * IntelliSense
 */
export type JurisVDOMElement =
    | (keyof Juris.RegisteredComponents extends never
          ? never
          : {
                [K in keyof Juris.RegisteredComponents]: {
                    [P in K]: Juris.RegisteredComponents[K] & {
                        children?: JurisTypes.ReactiveValue<JurisVDOMElementEx[]>;
                        key?: string | number;
                    };
                };
            }[keyof Juris.RegisteredComponents])
    | BaseJurisVDOMElement;

/**
 * Improved StyleValue type for deeply nested styles
 * This is a recursive type that allows:
 * - All CSS properties (via CSSProperties)
 * - Pseudo-classes, pseudo-elements, media queries (via ExtendedStyleObject features)
 * - Nested StyleObject for any custom selector
 * - Reactive values (functions, promises)
 */
export type StyleValue = {
    [K in keyof BaseStyleValue]?: BaseStyleValue[K];
} & {
    [key: string]: ReactiveValue<string | number> | StyleValue | undefined;
};

export interface JurisInstance<TState = Record<string, unknown>>
    extends Omit<BaseJurisInstance<TState>, 'getState' | 'setState'> {}

/**
 * Extended JurisInstance with arm() API
 */
export interface JurisInstance<TState = Record<string, unknown>> extends BaseJurisInstance<TState> {
    arm<T extends HTMLElement | Document | Window>(
        target: T,
        handlerFn: (context: unknown) => Record<string, (event: Event) => void>,
    ): ArmedInstance;
}

export interface ArmedInstance {
    events: Array<{
        name: string;
        actualEvent: string;
        handler: (event: Event) => void;
    }>;
    trigger: (eventName: string, eventData?: Record<string, unknown>) => boolean;
    cleanup: () => boolean;
}

export interface JurisConstructor {
    new <TState = Record<string, unknown>>(config?: unknown): JurisInstance<TState>;
}

export interface CSSExtractor {
    new (): {
        processProps: (props: unknown, elementName: string, domRenderer: unknown) => unknown;
        postProcessReactiveResult: (result: unknown, componentName: string, element: HTMLElement) => void;
        clear: () => void;
    };
}

// ============================================================================
// Headless Component Types (from juris-headless.js)
// ============================================================================

export interface HeadlessComponent<T = unknown> {
    api?: T;
    hooks?: {
        onRegister?: () => void;
        onUnregister?: () => void;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

export type HeadlessComponentFunction<T = unknown> = (props: unknown, context: unknown) => HeadlessComponent<T>;

export interface HeadlessManager {
    // biome-ignore lint/suspicious/noMisleadingInstantiator: External library type definition
    new (juris: JurisInstance, logger?: unknown): HeadlessManager;
    register<T = unknown>(
        name: string,
        componentFn: HeadlessComponentFunction<T>,
        options?: { autoInit?: boolean; [key: string]: unknown },
    ): void;
    initialize<T = unknown>(name: string, props?: unknown): HeadlessComponent<T> | null;
    initializeQueued(): void;
    getInstance<T = unknown>(name: string): HeadlessComponent<T> | undefined;
    getAPI<T = unknown>(name: string): T | undefined;
    getAllAPIs(): Record<string, unknown>;
    reinitialize<T = unknown>(name: string, props?: unknown): HeadlessComponent<T> | null;
    cleanup(): void;
    getStatus(): {
        registered: string[];
        initialized: string[];
        queued: string[];
        apis: string[];
    };
}

// ============================================================================
// Router Types (from juris-router.js headless component)
// ============================================================================

export interface RouterConfig {
    // State configuration
    statePath?: string; // Base path in state where URL data is stored (default: 'url')
    stateStructure?: {
        path?: string; // Key for current path (default: 'path')
        segments?: string; // Key for parsed segments (default: 'segments')
        params?: string; // Key for URL parameters (default: 'params')
        query?: string; // Key for query string (default: 'query')
        hash?: string; // Key for hash fragment (default: 'hash')
    };

    // URL handling
    mode?: 'hash' | 'history' | 'memory'; // Default: 'hash'
    basePath?: string; // Base path for history mode (default: '')
    caseSensitive?: boolean; // Case sensitive route matching (default: false)
    trailingSlash?: 'strict' | 'ignore' | 'redirect'; // Default: 'ignore'

    // Route configuration
    routes?: Record<string, RouteConfig>; // Route definitions with guards and metadata
    defaultRoute?: string; // Default route when none matches (default: '/')
    notFoundRoute?: string; // Route for 404 handling (default: '/404')

    // Route guards
    globalGuards?: {
        beforeEnter?: Array<RouteGuard>; // Global guards before any route
        afterEnter?: Array<RouteGuard>; // Global guards after route change
        beforeLeave?: Array<RouteGuard>; // Global guards before leaving route
    };

    // URL parsing
    parseQuery?: boolean; // Parse query string into object (default: true)
    parseParams?: boolean; // Parse route parameters (default: true)
    encodeParams?: boolean; // URL encode/decode parameters (default: true)

    // Segments parsing
    segmentParsing?: {
        enabled?: boolean;
        maxDepth?: number; // Maximum segment depth (default: 10)
        customKeys?: string[]; // Custom segment names (default: ['base', 'sub', 'section', 'item'])
        includeEmpty?: boolean; // Include empty segments (default: false)
    };

    // Event handling
    events?: {
        beforeChange?: (newUrl: string, oldUrl: string) => boolean | undefined; // Callback before URL change
        afterChange?: (newUrl: string, oldUrl: string) => void; // Callback after URL change
        onError?: (error: Error) => void; // Error handling callback
        onGuardFail?: (newUrl: string, oldUrl: string) => void; // Guard failure callback
    };

    // Advanced options
    debounceMs?: number; // Debounce URL changes (default: 0)
    syncOnStateChange?: boolean; // Sync URL when state changes (default: false)
    preventDuplicates?: boolean; // Prevent duplicate navigation (default: true)
    preserveScrollPosition?: boolean; // Restore scroll position (default: false)
    disregardParams?: string[]; // To disregard specific URL parameters (default: ['__state', '__v'])

    // Debug options
    debug?: boolean; // Enable debug logging (default: false)
    logPrefix?: string; // Prefix for log messages (default: '🧭')
}

export interface RouteConfig {
    guards?: Array<RouteGuard>; // Route-specific guards
    [key: string]: unknown; // Additional metadata
}

export type RouteGuard = (newUrl: string, oldUrl: string, routeMatch: RouteMatch | null) => boolean | Promise<boolean>;

export interface RouteMatch {
    path: string;
    route: RouteConfig;
    params: Record<string, string>;
    exact: boolean;
}

export interface ParsedURL {
    path: string; // normalized path
    segments: string[]; // parsed segments
    params: Record<string, string>;
    query: Record<string, string>;
    hash: string;
}

export interface RouterAPI {
    // Navigation
    navigate: (path: string, options?: { replace?: boolean; internal?: boolean }) => void;
    replace: (path: string, options?: { replace?: boolean }) => void;
    back: () => void;
    forward: () => void;
    go: (delta: number) => void;

    // State access
    getCurrentPath: () => string;
    getSegments: () => { full: string; parts: string[]; [key: string]: string };
    getParams: () => Record<string, string>;
    getQuery: () => Record<string, string>;

    // Route management
    addRoute: (path: string, routeConfig: RouteConfig) => void;
    removeRoute: (path: string) => void;
    hasRoute: (path: string) => boolean;
    matchRoute: (path: string) => RouteMatch | null;

    // Guard management
    addGuard: (type: 'beforeEnter' | 'afterEnter' | 'beforeLeave', guard: RouteGuard) => void;
    removeGuard: (type: 'beforeEnter' | 'afterEnter' | 'beforeLeave', guard: RouteGuard) => void;

    // Utilities
    buildUrl: (path: string, params?: Record<string, string>, query?: Record<string, string>) => string;
    parseUrl: (url: string) => ParsedURL;
    isActive: (path: string, exact?: boolean) => boolean;

    // Configuration
    updateConfig: (newConfig: Partial<RouterConfig>) => void;
    getConfig: () => RouterConfig;

    // Debug
    getState: () => RouterConfig.statePath;
    getHistory: () => string[];
}

// Global declarations for browser-loaded libraries
declare global {
    const Juris: JurisConstructor;
    const CSSExtractor: CSSExtractor;
    const Router: HeadlessComponentFunction<RouterAPI>;
    const HeadlessManager: HeadlessManager;
}
