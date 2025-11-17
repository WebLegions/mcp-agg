/// <reference lib="dom" />
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';
import type { JurisContext } from '../../types/juris';
import { ThemeSwitch } from './component';

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
            assert.ok(children[0].button);
        });

        test('should have proper button attributes', () => {
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const vdom = ThemeSwitch({}, mockContext) as any;

            const button = vdom.div.children[0].button;
            assert.ok(button);
            assert.equal(button.type, 'button');
            assert.equal(button.class, 'theme-switch-button');
            assert.ok(button['aria-pressed']);
            assert.ok(button['aria-label']);
        });

        test('should have track element', () => {
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const vdom = ThemeSwitch({}, mockContext) as any;

            const buttonChildren = vdom.div.children[0].button.children;
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const track = buttonChildren?.find((child: any) => child.div?.class === 'track');
            assert.ok(track);
        });

        test('should have thumb element with icon', () => {
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const vdom = ThemeSwitch({}, mockContext) as any;

            const buttonChildren = vdom.div.children[0].button.children;
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const thumb = buttonChildren?.find((child: any) => child.div?.class === 'thumb');
            assert.ok(thumb);

            const thumbChildren = thumb.div.children;
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const icon = thumbChildren?.find((child: any) => child.div?.class === 'icon');
            assert.ok(icon);
        });

        test('should have 4 sun rays', () => {
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const vdom = ThemeSwitch({}, mockContext) as any;

            const buttonChildren = vdom.div.children[0].button.children;
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const thumb = buttonChildren?.find((child: any) => child.div?.class === 'thumb');
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const icon = thumb?.div.children?.find((child: any) => child.div?.class === 'icon');
            const iconChildren = icon?.div.children || [];

            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const sunRays = iconChildren.filter((child: any) => child.span?.class === 'sun-ray');
            assert.equal(sunRays.length, 4);
        });

        test('should have ellipse with moon mask', () => {
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const vdom = ThemeSwitch({}, mockContext) as any;

            const buttonChildren = vdom.div.children[0].button.children;
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const thumb = buttonChildren?.find((child: any) => child.div?.class === 'thumb');
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const icon = thumb?.div.children?.find((child: any) => child.div?.class === 'icon');
            const iconChildren = icon?.div.children || [];

            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const ellipse = iconChildren.find((child: any) => child.span?.class === 'ellipse');
            assert.ok(ellipse);

            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const moonMask = ellipse?.span?.children?.find((child: any) => child.span?.class === 'moon-mask');
            assert.ok(moonMask);
        });
    });

    describe('Theme state', () => {
        test('should default to light theme when no preference saved', () => {
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const vdom = ThemeSwitch({}, mockContext) as any;

            const button = vdom.div.children[0].button;
            assert.equal(button['aria-pressed'], 'false');
            assert.equal(button['aria-label'], 'Set dark mode');
        });

        test('should read dark theme from localStorage', () => {
            localStorage.setItem('theme', 'dark');

            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const vdom = ThemeSwitch({}, mockContext) as any;

            const button = vdom.div.children[0].button;
            assert.equal(button['aria-pressed'], 'true');
            assert.equal(button['aria-label'], 'Set light mode');
        });

        test('should read light theme from localStorage', () => {
            localStorage.setItem('theme', 'light');

            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const vdom = ThemeSwitch({}, mockContext) as any;

            const button = vdom.div.children[0].button;
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

            const button = vdom.div.children[0].button;
            assert.ok(typeof button.onclick === 'function');
        });

        test('should toggle theme from light to dark on click', () => {
            localStorage.setItem('theme', 'light');
            document.documentElement.setAttribute('color-scheme', 'light');

            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const vdom = ThemeSwitch({}, mockContext) as any;

            // Create actual DOM button to test click behavior
            const buttonEl = document.createElement('button');
            buttonEl.setAttribute('aria-pressed', 'false');
            buttonEl.setAttribute('aria-label', 'Set dark mode');
            document.body.appendChild(buttonEl);

            // Simulate click
            const clickEvent = new MouseEvent('click', { bubbles: true });
            Object.defineProperty(clickEvent, 'currentTarget', { value: buttonEl });

            vdom.div.children[0].button.onclick?.(clickEvent);

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

            // Create actual DOM button to test click behavior
            const buttonEl = document.createElement('button');
            buttonEl.setAttribute('aria-pressed', 'true');
            buttonEl.setAttribute('aria-label', 'Set light mode');
            document.body.appendChild(buttonEl);

            // Simulate click
            const clickEvent = new MouseEvent('click', { bubbles: true });
            Object.defineProperty(clickEvent, 'currentTarget', { value: buttonEl });

            vdom.div.children[0].button.onclick?.(clickEvent);

            // Check that theme was toggled
            assert.equal(localStorage.getItem('theme'), 'light');
            assert.equal(document.documentElement.getAttribute('color-scheme'), 'light');
            assert.equal(buttonEl.getAttribute('aria-pressed'), 'false');
            assert.equal(buttonEl.getAttribute('aria-label'), 'Set dark mode');
        });
    });

    describe('oncreate lifecycle', () => {
        test('should have oncreate handler', () => {
            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const vdom = ThemeSwitch({}, mockContext) as any;

            assert.ok(typeof vdom.div.oncreate === 'function');
        });

        test('should set CSS custom properties on creation', () => {
            localStorage.setItem('theme', 'dark');
            document.documentElement.setAttribute('color-scheme', 'dark');

            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const vdom = ThemeSwitch({}, mockContext) as any;

            // Create actual DOM element
            const divEl = document.createElement('div');
            document.body.appendChild(divEl);

            // Call oncreate
            vdom.div.oncreate?.({ dom: divEl });

            // Check that custom properties were set
            assert.ok(divEl.style.getPropertyValue('--bg'));
            assert.ok(divEl.style.getPropertyValue('--fg'));
            assert.ok(divEl.style.getPropertyValue('--border'));
        });

        test('should set light theme colors', () => {
            localStorage.setItem('theme', 'light');
            document.documentElement.setAttribute('color-scheme', 'light');

            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const vdom = ThemeSwitch({}, mockContext) as any;

            const divEl = document.createElement('div');
            document.body.appendChild(divEl);

            vdom.div.oncreate?.({ dom: divEl });

            assert.equal(divEl.style.getPropertyValue('--bg'), '#ffffff');
            assert.equal(divEl.style.getPropertyValue('--fg'), '#1e293b');
            assert.ok(divEl.style.getPropertyValue('--border').includes('128'));
        });

        test('should set dark theme colors', () => {
            localStorage.setItem('theme', 'dark');
            document.documentElement.setAttribute('color-scheme', 'dark');

            // biome-ignore lint/suspicious/noExplicitAny: VDOM element type is complex union
            const vdom = ThemeSwitch({}, mockContext) as any;

            const divEl = document.createElement('div');
            document.body.appendChild(divEl);

            vdom.div.oncreate?.({ dom: divEl });

            assert.equal(divEl.style.getPropertyValue('--bg'), '#1e293b');
            assert.equal(divEl.style.getPropertyValue('--fg'), '#e2e8f0');
            assert.ok(divEl.style.getPropertyValue('--border').includes('255'));
        });
    });
});
