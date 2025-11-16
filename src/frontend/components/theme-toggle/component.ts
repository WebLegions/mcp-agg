/**
 * Scalar-style Theme Toggle Web Component
 * A beautiful animated theme toggle inspired by Scalar's dashboard
 */

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

export class ThemeToggle extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.render(); // Attach template early so browser starts loading CSS immediately
    }

    connectedCallback(): void {
        this.initTheme();
        this.setupEventListeners();
        this.updateColors();
    }

    updateColors(): void {
        const host = this.shadowRoot?.host as HTMLElement;
        if (!host) return;

        const scheme = document.documentElement.getAttribute('color-scheme');
        const isDark = scheme === 'dark';

        if (isDark) {
            host.style.setProperty('--bg', '#1e293b');
            host.style.setProperty('--fg', '#e2e8f0');
            host.style.setProperty('--border', 'rgba(255, 255, 255, 0.2)');
        } else {
            host.style.setProperty('--bg', '#ffffff');
            host.style.setProperty('--fg', '#1e293b');
            host.style.setProperty('--border', 'rgba(128, 128, 128, 0.3)');
        }
    }

    render(): void {
        if (!this.shadowRoot) return;

        const template = document.createElement('template');
        template.innerHTML = `
      <link rel="stylesheet" href="/public/components/theme-toggle/style.css">
      <button
        type="button"
        aria-pressed="false"
        aria-label="Toggle theme"
      >
        <div class="track"></div>
        <div class="thumb">
          <div class="icon">
            <span class="sun-ray"></span>
            <span class="sun-ray"></span>
            <span class="sun-ray"></span>
            <span class="sun-ray"></span>
            <span class="ellipse">
              <span class="moon-mask"></span>
            </span>
          </div>
        </div>
      </button>
    `;
        this.shadowRoot.appendChild(template.content.cloneNode(true));
    }

    initTheme(): void {
        // Theme is already set globally, just sync button state
        const theme = getThemePreference();
        const isDark = theme === 'dark';
        this.updateButton(isDark);
    }

    setupEventListeners(): void {
        const button = this.shadowRoot?.querySelector('button');
        button?.addEventListener('click', () => this.handleToggle());
    }

    handleToggle(): void {
        const newTheme = toggleTheme();
        const isDark = newTheme === 'dark';
        this.updateButton(isDark);
        this.updateColors();
    }

    updateButton(isDark: boolean): void {
        const button = this.shadowRoot?.querySelector('button');
        if (!button) return;

        button.setAttribute('aria-pressed', isDark.toString());
        button.setAttribute('aria-label', isDark ? 'Set light mode' : 'Set dark mode');
    }
}
