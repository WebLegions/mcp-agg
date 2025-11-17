/**
 * Theme Switch Component
 * A beautiful animated theme switch inspired by Scalar's dashboard
 * Juris VDOM component for toggling between light and dark themes
 */

import type { JurisContext, JurisInstance, JurisVDOMElement } from '../../types/juris';
import { loadCss } from '../../utils/helpers';

const THEME_KEY = 'theme';

/**
 * Get the current theme preference
 */
function getThemePreference(): 'dark' | 'light' {
    try {
        const savedTheme = localStorage.getItem(THEME_KEY);
        if (savedTheme === 'dark' || savedTheme === 'light') {
            return savedTheme;
        }
    } catch {
        // localStorage not available
    }

    // Fall back to system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
}

/**
 * Apply theme to document and save preference
 */
function applyAndSaveTheme(theme: 'dark' | 'light'): void {
    document.documentElement.setAttribute('color-scheme', theme);
    try {
        localStorage.setItem(THEME_KEY, theme);
    } catch {
        // localStorage not available
    }
}

/**
 * Toggle between dark and light themes
 */
function toggleTheme(): 'dark' | 'light' {
    const current = getThemePreference();
    const newTheme = current === 'dark' ? 'light' : 'dark';
    applyAndSaveTheme(newTheme);
    return newTheme;
}

/**
 * Update theme switch colors based on current theme
 */
function updateThemeColors(element: HTMLElement): void {
    const scheme = document.documentElement.getAttribute('color-scheme');
    const isDark = scheme === 'dark';

    if (isDark) {
        element.style.setProperty('--bg', '#1e293b');
        element.style.setProperty('--fg', '#e2e8f0');
        element.style.setProperty('--border', 'rgba(255, 255, 255, 0.2)');
    } else {
        element.style.setProperty('--bg', '#ffffff');
        element.style.setProperty('--fg', '#1e293b');
        element.style.setProperty('--border', 'rgba(128, 128, 128, 0.3)');
    }
}

/**
 * Theme Switch Component
 */
export function ThemeSwitch(_props: Record<string, never>, _ctx: JurisContext): JurisVDOMElement {
    const currentTheme = getThemePreference();
    const isDark = currentTheme === 'dark';

    // Apply theme during initialization
    if (typeof document !== 'undefined') {
        applyAndSaveTheme(currentTheme);
    }

    return {
        div: {
            class: 'theme-switch-container',
            oncreate: (vnode: { dom: HTMLElement }) => {
                // Update colors when component is created
                updateThemeColors(vnode.dom);
            },
            children: [
                {
                    button: {
                        type: 'button',
                        class: 'theme-switch-button',
                        'aria-pressed': isDark.toString(),
                        'aria-label': isDark ? 'Set light mode' : 'Set dark mode',
                        onclick: (e: Event) => {
                            const newTheme = toggleTheme();
                            const button = e.currentTarget as HTMLButtonElement;
                            const isDarkMode = newTheme === 'dark';

                            // Update button attributes
                            button.setAttribute('aria-pressed', isDarkMode.toString());
                            button.setAttribute('aria-label', isDarkMode ? 'Set light mode' : 'Set dark mode');

                            // Update colors
                            const container = button.parentElement;
                            if (container) {
                                updateThemeColors(container);
                            }
                        },
                        children: [
                            {
                                div: {
                                    class: 'track',
                                },
                            },
                            {
                                div: {
                                    class: 'thumb',
                                    children: [
                                        {
                                            div: {
                                                class: 'icon',
                                                children: [
                                                    { span: { class: 'sun-ray' } },
                                                    { span: { class: 'sun-ray' } },
                                                    { span: { class: 'sun-ray' } },
                                                    { span: { class: 'sun-ray' } },
                                                    {
                                                        span: {
                                                            class: 'ellipse',
                                                            children: [
                                                                {
                                                                    span: {
                                                                        class: 'moon-mask',
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
                            },
                        ],
                    },
                },
            ],
        },
    };
}

/**
 * Register ThemeSwitch component with Juris
 * Loads CSS and registers the component
 */
export function registerThemeSwitch(juris: JurisInstance): void {
    loadCss('/app/components/theme-switch/style.css');
    juris.registerComponent('ThemeSwitch', ThemeSwitch);
}
