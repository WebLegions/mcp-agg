/// <reference lib="dom" />
import { strict as assert } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { before, beforeEach, describe, test } from 'node:test';
import type { j } from '../main';
import { swaggerPage } from './swagger-page';

describe('Swagger Page Component (DOM Rendering)', () => {
    let juris: j.juris.JurisInstance;

    // One-time setup: Create DOM and load Juris
    before(() => {
        // Load Juris library via script tag
        const jurisPath = resolve(process.cwd(), 'node_modules/juris/juris.js');
        const jurisCode = readFileSync(jurisPath, 'utf-8');

        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.textContent = jurisCode;
        document.head.appendChild(script);

        // Execute script in window context
        Object(window).eval(jurisCode);

        juris = new Juris({ states: {} });
        juris.registerComponent('swaggerPage', swaggerPage as never);
    });

    // Before each test: Clear the body
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    test('should render iframe with correct layout and styling', () => {
        const vnode: j.Elem = {
            div: {
                children: [{ swaggerPage: {} }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Verify container
        const container = document.querySelector('div');
        assert.ok(container, 'Container div should exist');

        // Verify iframe exists and has correct attributes
        const iframe = document.querySelector('iframe');
        assert.ok(iframe, 'Iframe should exist in DOM');
        assert.ok(iframe.src.includes('/api/v1/swagger'), `Expected src to contain /api/v1/swagger, got ${iframe.src}`);

        // Check iframe styles
        assert.equal(iframe.style.width, '100%', 'Iframe width should be 100%');
        assert.equal(iframe.style.height, 'calc(100vh - 4rem)', 'Iframe height should be calc(100vh - 4rem)');

        // Border style might be empty string, 'none', or 'none none' depending on DOM implementation
        assert.ok(
            iframe.style.border.includes('none') || iframe.style.border === '',
            `Expected border to include 'none' or be '', got '${iframe.style.border}'`,
        );
    });

    test('should have correct DOM hierarchy and be stateless', () => {
        const vnode: j.Elem = {
            div: {
                children: [{ swaggerPage: {} }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Verify iframe exists in the page
        const iframe = document.querySelector('iframe');
        assert.ok(iframe, 'Iframe should exist');
        assert.ok(iframe.src.includes('/api/v1/swagger'), 'Iframe should point to swagger endpoint');

        // Test statelessness - render again should produce same result
        document.body.innerHTML = '';
        const element2 = juris.objectToHtml(vnode);
        document.body.appendChild(element2 as Node);

        const iframe2 = document.querySelector('iframe');
        assert.ok(iframe2?.src.includes('/api/v1/swagger'), `Expected src to contain /api/v1/swagger, got ${iframe2?.src}`);
        assert.equal(iframe2?.style.width, '100%');
        assert.equal(iframe2?.style.height, 'calc(100vh - 4rem)');
    });
});
