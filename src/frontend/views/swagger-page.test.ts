/// <reference lib="dom" />
import { strict as assert } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { before, beforeEach, describe, test } from 'node:test';
import type { JurisInstance, JurisVDOMElement } from '../types/juris';
import { swaggerPage } from './swagger-page';

describe('Swagger Page Component (DOM Rendering)', () => {
    let juris: JurisInstance;

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
        const vnode: JurisVDOMElement = {
            div: {
                children: [{ swaggerPage: {} }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Verify container
        const outerDiv = document.querySelector('div');
        assert.ok(outerDiv);
        const container = outerDiv.firstElementChild as HTMLElement;
        assert.ok(container, 'Container should exist');
        assert.equal(container.style.height, 'calc(100vh - 64px)');
        assert.equal(container.style.width, '100%');
        assert.equal(container.style.display, 'flex');
        assert.equal(container.style.flexDirection, 'column');

        // Verify iframe exists and has correct attributes
        const iframe = document.querySelector('iframe');
        assert.ok(iframe, 'Iframe should exist in DOM');
        assert.ok(iframe.src.endsWith('/swagger'), `Expected src to end with /swagger, got ${iframe.src}`);
        // Happy-DOM may expand flex shorthand to "1 1 0%"
        assert.ok(iframe.style.flex.includes('1'), `Expected flex to contain 1, got ${iframe.style.flex}`);
        // Border style might be empty string, 'none', or 'none none' depending on DOM implementation
        assert.ok(
            iframe.style.border.includes('none') || iframe.style.border === '',
            `Expected border to include 'none' or be '', got '${iframe.style.border}'`,
        );
        assert.equal(iframe.style.width, '100%');
        assert.equal(iframe.style.height, '100%');
    });

    test('should have correct DOM hierarchy and be stateless', () => {
        const vnode: JurisVDOMElement = {
            div: {
                children: [{ swaggerPage: {} }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Verify hierarchy: outer > container > iframe
        const container = document.querySelector('div')?.firstElementChild;
        assert.ok(container, 'Container should exist');

        const children = Array.from(container?.children || []);
        assert.equal(children.length, 1, 'Container should have 1 child');
        assert.equal(children[0].tagName, 'IFRAME', 'Child should be iframe');

        // Test statelessness - render again should produce same result
        document.body.innerHTML = '';
        const element2 = juris.objectToHtml(vnode);
        document.body.appendChild(element2 as Node);

        const iframe2 = document.querySelector('iframe');
        assert.ok(iframe2?.src.endsWith('/swagger'));
        assert.ok(iframe2?.style.flex.includes('1'));
    });
});
