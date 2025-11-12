/// <reference lib="dom" />
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { ThemeToggle } from './component';

describe('ThemeToggle Component', () => {
    beforeEach(() => {
        // Clear localStorage and document state before each test
        localStorage.clear();
        document.documentElement.removeAttribute('color-scheme');

        // Register custom element if not already registered
        if (!customElements.get('theme-toggle')) {
            customElements.define('theme-toggle', ThemeToggle);
        }
    });

    afterEach(() => {
        // Clean up DOM
        document.body.innerHTML = '';
        document.documentElement.removeAttribute('color-scheme');
    });

    describe('Component initialization', () => {
        test('should create component with shadow root', () => {
            const el = new ThemeToggle();
            assert.ok(el.shadowRoot);
        });

        test('should render button in shadow DOM', () => {
            const el = new ThemeToggle();
            document.body.appendChild(el);

            const button = el.shadowRoot?.querySelector('button');
            assert.ok(button);
            assert.equal(button.getAttribute('type'), 'button');
        });

        test('should have aria-label attribute', () => {
            const el = new ThemeToggle();
            document.body.appendChild(el);

            const button = el.shadowRoot?.querySelector('button');
            assert.ok(button?.hasAttribute('aria-label'));
        });

        test('should have aria-pressed attribute', () => {
            const el = new ThemeToggle();
            document.body.appendChild(el);

            const button = el.shadowRoot?.querySelector('button');
            assert.ok(button?.hasAttribute('aria-pressed'));
        });
    });

    test('should default to light theme when no preference saved', () => {
        const el = new ThemeToggle();
        document.body.appendChild(el);

        const button = el.shadowRoot?.querySelector('button');
        assert.equal(button?.getAttribute('aria-pressed'), 'false');
    });

    test('should read dark theme from localStorage', () => {
        localStorage.setItem('theme', 'dark');

        const el = new ThemeToggle();
        document.body.appendChild(el);

        const button = el.shadowRoot?.querySelector('button');
        assert.equal(button?.getAttribute('aria-pressed'), 'true');
    });

    test('should read light theme from localStorage', () => {
        localStorage.setItem('theme', 'light');

        const el = new ThemeToggle();
        document.body.appendChild(el);

        const button = el.shadowRoot?.querySelector('button');
        assert.equal(button?.getAttribute('aria-pressed'), 'false');
    });

    test('should toggle from light to dark', () => {
        localStorage.setItem('theme', 'light');

        const el = new ThemeToggle();
        document.body.appendChild(el);

        const button = el.shadowRoot?.querySelector('button');
        button?.click();

        assert.equal(localStorage.getItem('theme'), 'dark');
        assert.equal(button?.getAttribute('aria-pressed'), 'true');
        assert.equal(document.documentElement.getAttribute('color-scheme'), 'dark');
    });

    test('should toggle from dark to light', () => {
        localStorage.setItem('theme', 'dark');
        document.documentElement.setAttribute('color-scheme', 'dark');

        const el = new ThemeToggle();
        document.body.appendChild(el);

        const button = el.shadowRoot?.querySelector('button');
        button?.click();

        assert.equal(localStorage.getItem('theme'), 'light');
        assert.equal(button?.getAttribute('aria-pressed'), 'false');
        assert.equal(document.documentElement.getAttribute('color-scheme'), 'light');
    });

    test('should update aria-label when toggling', () => {
        const el = new ThemeToggle();
        document.body.appendChild(el);

        const button = el.shadowRoot?.querySelector('button');
        const initialLabel = button?.getAttribute('aria-label');

        button?.click();

        const newLabel = button?.getAttribute('aria-label');
        assert.notEqual(initialLabel, newLabel);
    });

    test('should set custom properties for dark theme', () => {
        localStorage.setItem('theme', 'dark');
        document.documentElement.setAttribute('color-scheme', 'dark');

        const el = new ThemeToggle();
        document.body.appendChild(el);

        const style = getComputedStyle(el);
        assert.ok(style.getPropertyValue('--bg'));
        assert.ok(style.getPropertyValue('--fg'));
        assert.ok(style.getPropertyValue('--border'));
    });

    test('should set custom properties for light theme', () => {
        localStorage.setItem('theme', 'light');
        document.documentElement.setAttribute('color-scheme', 'light');

        const el = new ThemeToggle();
        document.body.appendChild(el);

        const style = getComputedStyle(el);
        assert.ok(style.getPropertyValue('--bg'));
        assert.ok(style.getPropertyValue('--fg'));
        assert.ok(style.getPropertyValue('--border'));
    });

    test('should update colors when theme changes', () => {
        const el = new ThemeToggle();
        document.body.appendChild(el);

        const initialBg = getComputedStyle(el).getPropertyValue('--bg');

        const button = el.shadowRoot?.querySelector('button');
        button?.click();

        const newBg = getComputedStyle(el).getPropertyValue('--bg');
        assert.notEqual(initialBg, newBg);
    });

    test('should have track element', () => {
        const el = new ThemeToggle();
        document.body.appendChild(el);

        const track = el.shadowRoot?.querySelector('.track');
        assert.ok(track);
    });

    test('should have thumb element', () => {
        const el = new ThemeToggle();
        document.body.appendChild(el);

        const thumb = el.shadowRoot?.querySelector('.thumb');
        assert.ok(thumb);
    });

    test('should have icon element', () => {
        const el = new ThemeToggle();
        document.body.appendChild(el);

        const icon = el.shadowRoot?.querySelector('.icon');
        assert.ok(icon);
    });

    test('should have sun rays', () => {
        const el = new ThemeToggle();
        document.body.appendChild(el);

        const rays = el.shadowRoot?.querySelectorAll('.sun-ray');
        assert.equal(rays?.length, 4);
    });

    test('should have ellipse and moon mask', () => {
        const el = new ThemeToggle();
        document.body.appendChild(el);

        const ellipse = el.shadowRoot?.querySelector('.ellipse');
        const moonMask = el.shadowRoot?.querySelector('.moon-mask');

        assert.ok(ellipse);
        assert.ok(moonMask);
    });
});
