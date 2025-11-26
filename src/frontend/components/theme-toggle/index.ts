/**
 * Theme Toggle Component
 * A beautiful animated theme switch inspired by Scalar's dashboard
 * Juris VDOM component for toggling between light and dark themes
 */

import type { j } from '../../main';
import { themeSunMoonIcon } from '../icon';

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
 * Theme Switch Component
 */
export const themeToggle: j.Component = (_props, _ctx) => {
    const currentTheme = getThemePreference();
    const isDark = currentTheme === 'dark';

    // Apply theme during initialization
    if (typeof document !== 'undefined') {
        applyAndSaveTheme(currentTheme);
    }

    // CSSExtractor Styles using classless theme CSS variables
    const style = {
        // Container styles
        width: '38px',
        height: '24px',
        overflow: 'hidden',
        lineHeight: '0',

        // Use CSS variables from classless theme - automatically adapts to theme changes
        '--bg': 'var(--card-bg)',
        '--fg': 'var(--body-color)',
        '--border': 'var(--border-color)',

        // Child selectors
        '& .theme-switch-button': {
            display: 'flex',
            height: '24px',
            width: '38px',
            alignItems: 'center',
            padding: '0',
            margin: '0',
            position: 'relative',
            outline: 'none',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            lineHeight: '0',
            // Reset any inherited styles
            font: 'inherit',
            color: 'inherit',
            textDecoration: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            appearance: 'none',
        },

        '& .theme-switch-button:focus-visible .track': {
            boxShadow: '0 0 0 2px var(--border)',
        },

        '& .track': {
            height: '12px',
            width: '100%',
            background: 'var(--border)',
            margin: '0 1px',
            borderRadius: 'var(--border-radius-full)',
        },

        '& .thumb': {
            width: '20px',
            height: '20px',
            position: 'absolute',
            left: '0',
            border: '1px solid var(--border)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg)',
            transition: 'var(--transition-base)',
            cursor: 'pointer',
        },

        '& .thumb:hover': {
            filter: 'brightness(1.2) contrast(1.05)', // Match icon hover effect
            transform: 'scale(1.05)', // Match icon scale effect
        },

        '& .thumb:active': {
            transform: 'scale(0.95)', // Match icon active/press effect
        },

        '& .theme-switch-button[aria-pressed="true"] .thumb': {
            transform: 'translateX(18px)',
        },

        // When both hover and pressed, combine transforms
        '& .theme-switch-button[aria-pressed="true"] .thumb:hover': {
            transform: 'translateX(18px) scale(1.05)',
        },

        '& .theme-switch-button[aria-pressed="true"] .thumb:active': {
            transform: 'translateX(18px) scale(0.95)',
        },

        '& .theme-icon': {
            width: '12px',
            height: '12px',
            color: 'var(--fg)',
            overflow: 'visible',
        },

        // Sun rays
        '& .sun-ray': {
            transition: 'var(--transition-base)',
            transformOrigin: 'center',
            opacity: 1,
        },

        // Moon path - hidden in light mode
        '& .moon': {
            transition: 'var(--transition-base)',
            opacity: 0,
            transform: 'scale(0)',
            transformOrigin: 'center',
        },

        // Dark mode styles - hide sun rays, show moon
        '& .theme-switch-button[aria-pressed="true"] .sun-ray': {
            opacity: 0,
            transform: 'scale(0)',
        },

        '& .theme-switch-button[aria-pressed="true"] .moon': {
            opacity: 1,
            transform: 'scale(1)',
        },
    };

    return {
        div: {
            class: 'theme-switch-container',
            style,
            oncreate: () => {
                // No manual color updates needed - CSS variables handle theme changes automatically
            },
            children: [
                {
                    div: {
                        class: 'theme-switch-button',
                        role: 'button',
                        tabindex: '0',
                        'aria-pressed': isDark.toString(),
                        'aria-label': isDark ? 'Set light mode' : 'Set dark mode',
                        title: isDark ? 'Switch to light mode' : 'Switch to dark mode',
                        onclick: (e: Event) => {
                            const newTheme = toggleTheme();
                            const button = e.currentTarget as HTMLElement;
                            const isDarkMode = newTheme === 'dark';

                            // Update button attributes
                            button.setAttribute('aria-pressed', isDarkMode.toString());
                            button.setAttribute('aria-label', isDarkMode ? 'Set light mode' : 'Set dark mode');
                            button.setAttribute('title', isDarkMode ? 'Switch to light mode' : 'Switch to dark mode');

                            // Colors update automatically via CSS variables
                        },
                        onkeydown: (e: KeyboardEvent) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                const newTheme = toggleTheme();
                                const button = e.currentTarget as HTMLElement;
                                const isDarkMode = newTheme === 'dark';

                                // Update button attributes
                                button.setAttribute('aria-pressed', isDarkMode.toString());
                                button.setAttribute('aria-label', isDarkMode ? 'Set light mode' : 'Set dark mode');
                                button.setAttribute('title', isDarkMode ? 'Switch to light mode' : 'Switch to dark mode');

                                // Colors update automatically via CSS variables
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
                                            svg: themeSunMoonIcon,
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
};

// Register component in App.Components namespace for better type inference
declare global {
    namespace App {
        interface Components {
            themeToggle: Record<string, never>;
        }
    }
}
