/**
 * Icon Component
 * Uses JurisJS CSSExtractor for automatic CSS isolation and scoping
 */

import type { ExtendedStyleObject, JurisComponentFunction, JurisContext, JurisInstance, JurisVDOMElement } from '../../types/juris';

export interface IconProps {
    svg: JurisVDOMElement;
    onClick?: () => void;
    onHover?: () => void;
    ariaLabel: string;
    title?: string;
}

/**
 * Icon Component with automatic CSS extraction
 *
 * All styles are defined inline and CSSExtractor automatically:
 * - Extracts static styles to <style> tag with unique class names
 * - Handles pseudo-selectors (&:hover, &:focus, &:active)
 * - Processes media queries (@media)
 * - Caches extracted CSS to avoid duplication
 */
export function Icon(props: IconProps, _ctx: JurisContext): JurisVDOMElement {
    const { svg, onClick, onHover, ariaLabel, title } = props;
    const hasInteraction = onClick !== undefined;

    const style: ExtendedStyleObject = {
        // CSSExtractor processes these styles automatically
        // Base styles (static - extracted to <style> tag)
        display: 'inline-block',
        lineHeight: 0,
        padding: 0,
        margin: 0,
        outline: 'none',
        border: 'none',
        background: 'transparent',
        font: 'inherit',
        color: 'inherit',
        textDecoration: 'none',
        WebkitAppearance: 'none',
        MozAppearance: 'none',
        appearance: 'none',

        // Conditional cursor (dynamic - kept inline)
        cursor: hasInteraction ? 'pointer' : 'default',

        // Pseudo-selector for focus (auto-extracted with &:focus-visible)
        '&:focus-visible svg': {
            boxShadow: '0 0 0 2px rgba(128, 128, 128, 0.3)',
        },

        // Hover effect - only if interactive (conditional extraction)
        ...(hasInteraction && {
            '&:hover svg': {
                filter: 'brightness(1.2) contrast(1.05)',
                transform: 'scale(1.05)',
            },
        }),

        // Active/press effect - only if interactive
        ...(hasInteraction && {
            '&:active svg': {
                transform: 'scale(0.95)',
            },
        }),

        // Nested SVG styles (auto-extracted with & selector)
        '& svg': {
            width: '20px',
            height: '20px',
            display: 'block',
            transition: 'var(--transition-base)',
        },

        // Icon background circle
        '& .icon-bg': {
            fill: 'var(--card-bg)',
            stroke: 'var(--border-color)',
            strokeWidth: '1px',
            transition: 'var(--transition-base)',
        },

        // Icon text/path
        '& .icon-text': {
            fill: 'var(--body-color)',
            transition: 'var(--transition-base)',
        },

        // Dark mode media query (auto-extracted)
        '@media (prefers-color-scheme: dark)': {
            '&:focus-visible svg': {
                boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.2)',
            },
            '& .icon-bg': {
                fill: 'var(--card-bg)',
                stroke: 'var(--border-color)',
            },
            '& .icon-text': {
                fill: 'var(--body-color)',
            },
        },

        // HTML attribute selector for explicit dark mode
        'html[color-scheme="dark"] &:focus-visible svg': {
            boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.2)',
        },
        'html[color-scheme="dark"] & .icon-bg': {
            fill: 'var(--card-bg)',
            stroke: 'var(--border-color)',
        },
        'html[color-scheme="dark"] & .icon-text': {
            fill: 'var(--body-color)',
        },
    };


    return {
        div: {
            'aria-label': ariaLabel,
            title: title || ariaLabel,
            role: hasInteraction ? 'button' : undefined,
            tabindex: hasInteraction ? '0' : undefined,
            onClick: onClick || (() => { }),
            onMouseEnter: onHover,
            onkeydown: hasInteraction
                ? (e: KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (onClick) {
                            onClick();
                        }
                    }
                }
                : undefined,

            // CSSExtractor processes these styles automatically
            style,
            children: [svg],
        },
    };
}

/**
 * Register Icon component with Juris
 * No more loadCss() - CSSExtractor handles everything!
 */
export function registerIcon(juris: JurisInstance): void {
    juris.registerComponent('Icon', Icon as JurisComponentFunction);
}

export * from './svg';
