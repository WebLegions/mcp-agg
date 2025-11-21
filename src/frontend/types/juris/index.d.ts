/**
 * Juris Type Definitions
 *
 * This file re-exports the base JurisJS types and adds project-specific extensions.
 * The base juris.d.ts file is kept unchanged to preserve the original library types.
 */

// Re-export all base Juris types
export * from './juris.d';

// Import types we need to extend or override
import type {
    JurisConfig as BaseJurisConfig,
    JurisInstance,
} from './juris.d';

// ============================================================================
// Extended Juris Configuration
// ============================================================================

/**
 * CSSExtractor class for automatic CSS isolation
 * Loaded from: https://cdn.jsdelivr.net/npm/juris@0.9.0/juris-cssextractor.js
 */
export interface CSSExtractorClass {
    new(): {
        processProps: (props: unknown, elementName: string, domRenderer: unknown) => unknown;
        postProcessReactiveResult: (result: unknown, componentName: string, element: HTMLElement) => void;
        clear: () => void;
    };
}

/**
 * Extended JurisConfig with features support for CSSExtractor
 * This extends the base JurisConfig to include the features object
 * as specified in JurisJS v0.9.0 documentation.
 */
export interface JurisConfig extends Omit<BaseJurisConfig, 'features'> {
    features?: {
        cssExtractor?: CSSExtractorClass;
    };
}

export interface JurisConstructor {
    new(config?: JurisConfig): JurisInstance;
}

// ============================================================================
// Extended Style Types for CSSExtractor
// ============================================================================

/**
 * Import base types for extension
 */
import type { CSSProperties, ReactiveValue } from './juris.d';

/**
 * Recursive ExtendedStyleObject that supports nested selectors in media queries
 *
 * This type properly supports CSSExtractor's runtime capabilities for nested selectors within:
 * - Media queries (@media)
 * - Container queries (@container)
 * - Support queries (@supports)
 * - Other at-rules (@layer, @page, etc.)
 * - Pseudo-classes and pseudo-elements
 *
 * The base juris.d.ts ExtendedStyleObject only allows CSSProperties in nested contexts,
 * but CSSExtractor actually supports full recursive nesting.
 *
 * We override the base ExtendedStyleObject with this recursive interface. To avoid index
 * signature conflicts, we use a broader type that accepts any valid style value.
 */
export interface ExtendedStyleObject extends CSSProperties {
    // Recursive index signatures for nesting support
    // Use broad type to avoid conflicts with CSSProperties string index signature
    [key: string]: ReactiveValue<string | number> | ExtendedStyleObject | Record<string, unknown> | undefined;
}

// ============================================================================
// Global Type Declarations
// ============================================================================

declare global {
    const Juris: JurisConstructor;
    const CSSExtractor: CSSExtractorClass;
}
