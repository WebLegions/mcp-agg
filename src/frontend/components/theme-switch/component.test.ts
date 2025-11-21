/// <reference lib="dom" />
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';
import type { JurisContext } from '../../types/juris';
import { ThemeSwitch } from '.';

describe('ThemeSwitch Component', () => {
    let mockContext: JurisContext;

    beforeEach(() => {
        // Clear localStorage and document state before each test
        localStorage.clear();
        document.documentElement.removeAttribute('color-scheme');
        document.body.innerHTML = '';

        // Create mock Juris context
        mockContext = {
            getState: <T>(_key: string, defaultValue?: T): T => {
                return defaultValue as T;
            },
            setState: (_key: string, _value: unknown) => {
                // no-op for tests
            },
            headlessAPIs: {},
            executeBatch: (callback: () => unknown) => callback(),
        } as JurisContext;
    });

    afterEach(() => {
        // Clean up DOM
        document.body.innerHTML = '';
        document.documentElement.removeAttribute('color-scheme');
        localStorage.clear();
    });

    describe('Component structure', () => {
        test('should return VDOM element with container div', () => {
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const vdom = ThemeSwitch({}, mockContext) as any;

            assert.ok(vdom.div);
            assert.equal(vdom.div.class, 'theme-switch-container');
        });

        test('should have button in children', () => {
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const vdom = ThemeSwitch({}, mockContext) as any;

            const children = vdom.div.children;
            assert.ok(Array.isArray(children));
            assert.equal(children.length, 1);
            assert.ok(children[0].div);
        });

        test('should have proper button attributes', () => {
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const vdom = ThemeSwitch({}, mockContext) as any;

            const button = vdom.div.children[0].div;
            assert.ok(button);
            assert.equal(button.role, 'button');
            assert.equal(button.class, 'theme-switch-button');
            assert.ok(button['aria-pressed']);
            assert.ok(button['aria-label']);
        });

        test('should have track element', () => {
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const vdom = ThemeSwitch({}, mockContext) as any;

            const buttonChildren = vdom.div.children[0].div.children;
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const track = buttonChildren?.find((child: any) => child.div?.class === 'track');
            assert.ok(track);
        });

        test('should have thumb element with svg icon', () => {
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const vdom = ThemeSwitch({}, mockContext) as any;

            const buttonChildren = vdom.div.children[0].div.children;
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const thumb = buttonChildren?.find((child: any) => child.div?.class === 'thumb');
            assert.ok(thumb);

            const thumbChildren = thumb.div.children;
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const svg = thumbChildren?.find((child: any) => child.svg?.class === 'theme-icon');
            assert.ok(svg);
        });

        test('should have 4 sun rays as SVG lines', () => {
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const vdom = ThemeSwitch({}, mockContext) as any;

            const buttonChildren = vdom.div.children[0].div.children;
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const thumb = buttonChildren?.find((child: any) => child.div?.class === 'thumb');
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const svg = thumb?.div.children?.find((child: any) => child.svg?.class === 'theme-icon');
            const svgChildren = svg?.svg.children || [];

            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const sunRays = svgChildren.filter((child: any) => child.line?.class === 'sun-ray');
            assert.equal(sunRays.length, 4);
        });

        test('should have moon path in SVG', () => {
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const vdom = ThemeSwitch({}, mockContext) as any;

            const buttonChildren = vdom.div.children[0].div.children;
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const thumb = buttonChildren?.find((child: any) => child.div?.class === 'thumb');
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const svg = thumb?.div.children?.find((child: any) => child.svg?.class === 'theme-icon');
            const svgChildren = svg?.svg.children || [];

            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const moon = svgChildren.find((child: any) => child.path?.class === 'moon');
            assert.ok(moon);
            assert.ok(moon.path.d); // Should have path data
        });
    });

    describe('Theme state', () => {
        test('should default to light theme when no preference saved', () => {
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const vdom = ThemeSwitch({}, mockContext) as any;

            const button = vdom.div.children[0].div;
            assert.equal(button['aria-pressed'], 'false');
            assert.equal(button['aria-label'], 'Set dark mode');
        });

        test('should read dark theme from localStorage', () => {
            localStorage.setItem('theme', 'dark');

            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const vdom = ThemeSwitch({}, mockContext) as any;

            const button = vdom.div.children[0].div;
            assert.equal(button['aria-pressed'], 'true');
            assert.equal(button['aria-label'], 'Set light mode');
        });

        test('should read light theme from localStorage', () => {
            localStorage.setItem('theme', 'light');

            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const vdom = ThemeSwitch({}, mockContext) as any;

            const button = vdom.div.children[0].div;
            assert.equal(button['aria-pressed'], 'false');
            assert.equal(button['aria-label'], 'Set dark mode');
        });

        test('should set document color-scheme attribute', () => {
            localStorage.setItem('theme', 'dark');

            ThemeSwitch({}, mockContext);

            assert.equal(document.documentElement.getAttribute('color-scheme'), 'dark');
        });
    });

    describe('Theme toggle interaction', () => {
        test('should have onclick handler', () => {
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const vdom = ThemeSwitch({}, mockContext) as any;

            const button = vdom.div.children[0].div;
            assert.ok(typeof button.onclick === 'function');
        });

        test('should toggle theme from light to dark on click', () => {
            localStorage.setItem('theme', 'light');
            document.documentElement.setAttribute('color-scheme', 'light');

            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const vdom = ThemeSwitch({}, mockContext) as any;

            // Create actual DOM div to test click behavior
            const buttonEl = document.createElement('div');
            buttonEl.setAttribute('aria-pressed', 'false');
            buttonEl.setAttribute('aria-label', 'Set dark mode');
            document.body.appendChild(buttonEl);

            // Simulate click
            const clickEvent = new MouseEvent('click', { bubbles: true });
            Object.defineProperty(clickEvent, 'currentTarget', { value: buttonEl });

            vdom.div.children[0].div.onclick?.(clickEvent);

            // Check that theme was toggled
            assert.equal(localStorage.getItem('theme'), 'dark');
            assert.equal(document.documentElement.getAttribute('color-scheme'), 'dark');
            assert.equal(buttonEl.getAttribute('aria-pressed'), 'true');
            assert.equal(buttonEl.getAttribute('aria-label'), 'Set light mode');
        });

        test('should toggle theme from dark to light on click', () => {
            localStorage.setItem('theme', 'dark');
            document.documentElement.setAttribute('color-scheme', 'dark');

            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const vdom = ThemeSwitch({}, mockContext) as any;

            // Create actual DOM div to test click behavior
            const buttonEl = document.createElement('div');
            buttonEl.setAttribute('aria-pressed', 'true');
            buttonEl.setAttribute('aria-label', 'Set light mode');
            document.body.appendChild(buttonEl);

            // Simulate click
            const clickEvent = new MouseEvent('click', { bubbles: true });
            Object.defineProperty(clickEvent, 'currentTarget', { value: buttonEl });

            vdom.div.children[0].div.onclick?.(clickEvent);

            // Check that theme was toggled
            assert.equal(localStorage.getItem('theme'), 'light');
            assert.equal(document.documentElement.getAttribute('color-scheme'), 'light');
            assert.equal(buttonEl.getAttribute('aria-pressed'), 'false');
            assert.equal(buttonEl.getAttribute('aria-label'), 'Set dark mode');
        });
    });

    describe('CSS theming', () => {
        test('should use classless.css CSS variables', () => {
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const vdom = ThemeSwitch({}, mockContext) as any;

            // Check that style uses CSS variables that reference classless.css
            const style = vdom.div.style;
            assert.ok(style['--bg'].includes('var(--card-bg'));
            assert.ok(style['--fg'].includes('var(--body-color'));
            assert.ok(style['--border'].includes('var(--border-color'));
        });

        test('should have oncreate handler (no-op for CSS-only theming)', () => {
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const vdom = ThemeSwitch({}, mockContext) as any;

            // oncreate still exists but doesn't do manual color updates
            assert.ok(typeof vdom.div.oncreate === 'function');
        });

        test('should use aria-pressed attribute for icon visibility', () => {
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const vdom = ThemeSwitch({}, mockContext) as any;

            const style = vdom.div.style;

            // Check that aria-pressed selectors exist for sun/moon icons
            assert.ok(style['& .theme-switch-button[aria-pressed="true"] .sun-ray']);
            assert.ok(style['& .theme-switch-button[aria-pressed="true"] .moon']);
        });
    });
});
