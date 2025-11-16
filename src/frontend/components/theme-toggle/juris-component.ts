/**
 * Theme Toggle Web Component using JurisJS WebComponentFactory
 * Allows switching between light and dark themes
 */

import type { JurisConstructor } from '../../types/juris';

// biome-ignore lint/style/useNamingConvention: Juris is an external library global
declare const Juris: JurisConstructor;

const THEME_KEY = 'theme';

/**
 * Get the current theme preference
 */
function getThemePreference(): 'dark' | 'light' {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme;
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
}

/**
 * Apply theme to document and save preference
 */
function _applyAndSaveTheme(theme: 'dark' | 'light'): void {
    document.documentElement.setAttribute('color-scheme', theme);
    localStorage.setItem(THEME_KEY, theme);
}

// Wait for DOM to be ready
if (typeof window !== 'undefined') {
    // Initialize Juris for theme toggle
    const _juris = new Juris({
        logLevel: 'error',
        states: {
            theme: {
                current: getThemePreference(),
                isDark: getThemePreference() === 'dark',
            },
        },
    });

    // TODO: Create the theme toggle web component when createWebComponent API is available
    /* _juris.createWebComponent(
        'juris-theme-toggle',
        (
            _props: unknown,
            context: {
                component: {
                    getState: (key: string, defaultValue?: unknown) => unknown;
                    setState: (key: string, value: unknown) => void;
                };
            },
        ) => {
            const isDark = context.component.getState('theme.isDark', false);
            const themeIcon = isDark ? '🌙' : '☀️';
            const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

            return {
                button: {
                    type: 'button',
                    'aria-label': label,
                    title: label,
                    text: themeIcon,
                    style: `
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    z-index: 2000;
                    border: none;
                    background: var(--bg, #fff);
                    cursor: pointer;
                    padding: 12px;
                    border-radius: 50%;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                    font-size: 24px;
                    line-height: 1;
                    width: 50px;
                    height: 50px;
                    transition: transform 0.2s;
                `,
                    onclick: () => {
                        const currentTheme = context.component.getState('theme.current', 'light');
                        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

                        context.component.setState('theme.current', newTheme);
                        context.component.setState('theme.isDark', newTheme === 'dark');

                        applyAndSaveTheme(newTheme);
                    },
                    onmouseover: (e: Event) => {
                        (e.target as HTMLElement).style.transform = 'scale(1.1)';
                    },
                    onmouseout: (e: Event) => {
                        (e.target as HTMLElement).style.transform = 'scale(1)';
                    },
                },
            };
        },
        {
            shadowMode: 'open',
        },
    ); */
}
