/**
 * Juris Type Definitions
 *
 * This file re-exports the base JurisJS types and adds project-specific extensions.
 * The base juris.d.ts file is kept unchanged to preserve the original library types.
 */

// Import types we need to extend or override
import type {
    JurisConfig as BaseJurisConfig,
    JurisInstance as BaseJurisInstance,
    ComponentState as BaseComponentState,
    JurisContext as BaseJurisContext,
    ReactiveValue,
    JurisVDOMElement as BaseJurisVDOMElement,
} from './juris.d';

// Re-export all base Juris types
export * from './juris.d';

// ============================================================================
// Extended State Management with Improved Type Inference
// ============================================================================

/**
 * Extended ComponentState that prevents literal type inference for primitive defaults
 * Overrides getState to widen primitive literal types (e.g., '/' becomes string, 5 becomes number).
 */
// biome-ignore lint/suspicious/noExplicitAny: Type parameter defaults need any for flexibility
export interface ComponentState<TState = any> extends Omit<BaseComponentState<TState>, 'getState'> {
    // biome-ignore lint/suspicious/noExplicitAny: Record value type needs any for dynamic state
    getState: TState extends Record<string, any>
        ? {
              // Overloads for primitive types with provided default (prevents literal type inference)
              (path: string, defaultValue: string, track?: boolean): string;
              (path: string, defaultValue: number, track?: boolean): number;
              (path: string, defaultValue: boolean, track?: boolean): boolean;
              (path: string, defaultValue: bigint, track?: boolean): bigint;
              // Generic overload for other types (must come last)
              <T>(path: string, defaultValue?: T, track?: boolean): T;
          }
        : {
              // Overloads for primitive types with provided default (prevents literal type inference)
              (path: string, defaultValue: string, track?: boolean): string;
              (path: string, defaultValue: number, track?: boolean): number;
              (path: string, defaultValue: boolean, track?: boolean): boolean;
              (path: string, defaultValue: bigint, track?: boolean): bigint;
              // Generic overload for other types (must come last)
              <T>(path: string, defaultValue?: T, track?: boolean): T;
          };
}

/** Extend JurisContext accordingly */
// biome-ignore lint/suspicious/noExplicitAny: Type parameter defaults need any for flexibility
export interface JurisContext<TState = any>
    extends Omit<BaseJurisContext<TState>, keyof ComponentState<TState>>,
        ComponentState<TState> {}

/**
 * Extended JurisInstance with improved type inference.
 * Note: Using state directly from the juris instance is an anti-pattern.
 * For test code use `juris.createContext().setState()`.
 */
export interface JurisInstance<TState = Record<string, unknown>>
    extends Omit<BaseJurisInstance<TState>, 'getState' | 'setState'> {}

// ============================================================================
// Extended Juris Configuration
// ============================================================================

/**
 * Extended JurisConfig with features support for CSSExtractor
 * This extends the base JurisConfig to include the features object
 * as specified in JurisJS v0.9.0 documentation.
 */
export interface JurisConfig extends Omit<BaseJurisConfig, 'features'> {
    features?: {
        cssExtractor?: CSSExtractor;
        headless?: HeadlessManager;
        headlessComponents?: Record<string, HeadlessComponent<unknown>>;
    };
}

export interface JurisConstructor {
    new <TState = Record<string, unknown>>(config?: JurisConfig): JurisInstance<TState>;
}

// ============================================================================
// Extended Style Types for CSSExtractor
// ============================================================================

/**
 * CSSExtractor class for automatic CSS isolation
 * Loaded from: https://cdn.jsdelivr.net/npm/juris@0.9.0/juris-cssextractor.js
 */
export interface CSSExtractor {
    new (): {
        processProps: (props: unknown, elementName: string, domRenderer: unknown) => unknown;
        postProcessReactiveResult: (result: unknown, componentName: string, element: HTMLElement) => void;
        clear: () => void;
    };
}

/**
 * Project-specific StyleObject that extends the base ExtendedStyleObject from juris.d.ts
 *
 * The base ExtendedStyleObject provides predefined pseudo-classes and media queries typed as CSSProperties.
 * This StyleObject adds:
 * - Index signature for any custom selector/media query
 * - Recursive nesting support (nested objects can also contain StyleObject)
 * - Reactive value support (functions, promises)
 *
 * This allows CSSExtractor's full runtime capabilities:
 * - Any pseudo-class/pseudo-element (not just predefined ones)
 * - Any media query with custom breakpoints
 * - Container queries (@container)
 * - Support queries (@supports)
 * - Other at-rules (@layer, @page, etc.)
 * - Deeply nested style structures
 */
export interface StyleObject extends ExtendedStyleObject {
    [key: string]: ReactiveValue<string | number> | StyleObject | Record<string, unknown> | undefined;
}

// ============================================================================
// Enhanced VDOM Element Type with Strict Component Checking
// ============================================================================

/**
 * Enhanced JurisVDOMElement that provides better IntelliSense for registered components.
 *
 * This overrides the base JurisVDOMElement to put registered components first in the union,
 * which helps TypeScript's type checker and IDE provide better suggestions and hover info.
 *
 * Note: Due to TypeScript union type behavior, this won't provide strict excess property
 * checking, but it does improve IntelliSense and F12 navigation for registered components.
 *
 * For strict type checking in specific contexts, use explicit type annotations:
 * ```typescript
 * const myIcon: { icon: IconProps } = { icon: { ... } };
 * ```
 */
export type JurisVDOMElement =
    // Registered components first (for better IntelliSense priority)
    | (keyof Juris.RegisteredComponents extends never
          ? never
          : {
                [K in keyof Juris.RegisteredComponents]: {
                    [P in K]: Juris.RegisteredComponents[K] & {
                        children?: ReactiveValue<JurisVDOMElement[]>;
                        key?: string | number;
                    };
                };
            }[keyof Juris.RegisteredComponents])
    // Standard HTML elements second
    | BaseJurisVDOMElement;

/**
 * Strict VDOM Element type for when you need compile-time validation.
 *
 * Use this type when you want TypeScript to catch invalid props:
 * ```typescript
 * const strictIcon: StrictVDOMElement<'icon'> = {
 *     icon: {
 *         svg: menuIcon,
 *         ariaLabel: 'test',
 *         // invalidProp: 'error' // ← TypeScript error!
 *     }
 * };
 * ```
 */
export type StrictVDOMElement<K extends keyof Juris.RegisteredComponents> = {
    [P in K]: Juris.RegisteredComponents[K] & {
        children?: ReactiveValue<JurisVDOMElement[]>;
        key?: string | number;
    };
};

// ============================================================================
// Re-export Application Types
// ============================================================================

// Re-export AppVDOMElement from main.ts for convenience
// (Actual definition is in main.ts to keep app-specific types together)
export type { AppVDOMElement } from '../../main';

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

export type HeadlessComponentFunction<T = unknown> = (props: unknown, context: JurisContext) => HeadlessComponent<T>;

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

// ============================================================================
// Global Type Declarations
// This is a standard pattern for TypeScript libraries imported into the browser.
// ============================================================================

declare global {
    const Juris: JurisConstructor;
    const CSSExtractor: CSSExtractor;
    const Router: HeadlessComponentFn<RouterAPI>;
    const HeadlessManager: HeadlessManager;
}
