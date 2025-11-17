/// <reference lib="dom" />
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { loadCss } from './helpers';

describe('Frontend Helpers', () => {
    beforeEach(() => {
        // Clear document head
        document.head.innerHTML = '';
    });

    afterEach(() => {
        // Clean up
        document.head.innerHTML = '';
    });

    describe('loadCss', () => {
        test('should load CSS file when not already loaded', () => {
            const href = '/app/components/test/style.css';
            const result = loadCss(href);

            assert.equal(result, true);
            const link = document.querySelector(`link[href="${href}"]`) as HTMLLinkElement;
            assert.ok(link);
            assert.equal(link.rel, 'stylesheet');
        });

        test('should not load CSS file if already loaded', () => {
            const href = '/app/components/test/style.css';

            // Load once
            const firstResult = loadCss(href);
            assert.equal(firstResult, true);

            // Try to load again
            const secondResult = loadCss(href);
            assert.equal(secondResult, false);

            // Should only have one link element
            const links = document.querySelectorAll(`link[href="${href}"]`);
            assert.equal(links.length, 1);
        });

        test('should append link to document head', () => {
            const href = '/app/components/test/style.css';
            const initialChildCount = document.head.children.length;

            loadCss(href);

            assert.equal(document.head.children.length, initialChildCount + 1);
            const lastChild = document.head.lastElementChild;
            assert.ok(lastChild instanceof HTMLLinkElement);
            assert.equal(lastChild.href, href);
        });

        test('should handle multiple different CSS files', () => {
            const href1 = '/app/components/test1/style.css';
            const href2 = '/app/components/test2/style.css';

            const result1 = loadCss(href1);
            const result2 = loadCss(href2);

            assert.equal(result1, true);
            assert.equal(result2, true);

            const link1 = document.querySelector(`link[href="${href1}"]`);
            const link2 = document.querySelector(`link[href="${href2}"]`);

            assert.ok(link1);
            assert.ok(link2);
            assert.equal(document.head.children.length, 2);
        });

        test('should return false when CSS already exists in head', () => {
            const href = '/app/components/test/style.css';

            // Manually add link
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            document.head.appendChild(link);

            // Try to load
            const result = loadCss(href);

            assert.equal(result, false);
            const links = document.querySelectorAll(`link[href="${href}"]`);
            assert.equal(links.length, 1);
        });
    });
});
