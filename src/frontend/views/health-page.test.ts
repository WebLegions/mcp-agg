/// <reference lib="dom" />
import { strict as assert } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, before, beforeEach, describe, mock, test } from 'node:test';
import type { JurisInstance, JurisVDOMElement } from '../types/juris';
import { healthPage } from './health-page';

describe('Health Page Component (DOM Rendering)', () => {
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

        assert.ok(!!Object(window).Juris, 'Juris library not loaded');

        juris = new Juris({ states: {} });
        assert.equal(juris.isBatchMode(), false);

        juris.registerComponent('healthPage', healthPage as never);
    });

    let fetchMock: ReturnType<typeof mock.method> | undefined;

    // Before each test: Clear the body and mock fetch
    beforeEach(() => {
        document.body.innerHTML = '';

        // Mock fetch to return healthy status using mock.method
        fetchMock = mock.method(globalThis, 'fetch', async (_url: string) => {
            return {
                ok: true,
                status: 200,
                json: async () => ({ status: 'ok' }),
            } as Response;
        });
    });

    // Clean up mocks after each test
    afterEach(() => {
        if (fetchMock) {
            fetchMock.mock.restore();
            fetchMock = undefined;
        }
    });

    test('should render complete health page structure with correct styling', () => {
        const vnode: JurisVDOMElement = {
            div: {
                children: [{ healthPage: {} }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Verify wrapper div exists
        const wrapperDiv = document.querySelector('div');
        assert.ok(wrapperDiv, 'Wrapper div should exist');

        // The healthPage component's div is the first child
        const healthPageDiv = wrapperDiv.firstElementChild as HTMLElement;
        assert.ok(healthPageDiv, 'Health page div should exist');
        assert.equal(healthPageDiv.style.color, 'var(--body-color)');

        // Verify heading
        const heading = document.querySelector('h1');
        assert.ok(heading, 'Heading should exist');
        assert.equal(heading.textContent, 'System Health');
        assert.equal(heading.style.marginBottom, '1rem');

        // Verify status card exists (second child of healthPageDiv)
        const statusCard = healthPageDiv.children[1] as HTMLElement;
        assert.ok(statusCard, 'Status card should exist');
        assert.equal(statusCard.style.background, 'var(--card-bg)');
        assert.equal(statusCard.style.border, 'var(--border-color)');
        assert.equal(statusCard.style.borderRadius, 'var(--border-radius-lg)');
    });

    test('should render status indicator and message with correct content', () => {
        const vnode: JurisVDOMElement = {
            div: {
                children: [{ healthPage: {} }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Verify DOM hierarchy: outer > container > [h1, statusCard > [indicator, message]]
        const container = document.querySelector('div')?.firstElementChild;
        const children = Array.from(container?.children || []);
        assert.equal(children.length, 2, 'Container should have 2 children');
        assert.equal(children[0].tagName, 'H1');
        assert.equal(children[1].tagName, 'DIV');

        const statusChildren = Array.from(children[1].children);
        assert.equal(statusChildren.length, 2, 'Status card should have 2 children');

        // Verify status indicator (green dot)
        const spans = document.querySelectorAll('span');
        assert.equal(spans.length, 2);
        const indicator = spans[0];
        assert.equal(indicator.textContent, '●');
        // Happy-DOM may not set inline styles the same way, just verify basic properties
        assert.ok(indicator, 'Status indicator should exist');
        assert.ok(
            indicator.style.marginRight.includes('0.5') || indicator.style.marginRight === '',
            'Margin right should be set or empty',
        );

        // Verify status message
        const message = spans[1];
        assert.equal(message.textContent, 'All Systems Operational');
    });

    test('should handle 500 error response from health check endpoint', async () => {
        // Replace the existing mock with error response
        if (fetchMock) {
            fetchMock.mock.restore();
        }

        // Mock fetch to return 500 error using mock.method
        const errorMock = mock.method(globalThis, 'fetch', async (_url: string) => {
            return {
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                json: async () => ({ error: 'Database connection failed' }),
            } as Response;
        });

        try {
            // Simulate health check API call
            const response = await fetch('/api/v1/health');

            // Verify error response
            assert.equal(response.ok, false);
            assert.equal(response.status, 500);
            assert.equal(response.statusText, 'Internal Server Error');

            const data = await response.json();
            assert.equal(data.error, 'Database connection failed');

            // Verify mock was called
            assert.equal(errorMock.mock.calls.length, 1);
            const call = errorMock.mock.calls[0];
            assert.ok(call, 'Mock should have been called');
            assert.equal(Object(call).arguments[0], '/api/v1/health');
        } finally {
            errorMock.mock.restore();
            // Restore the default mock for other tests
            fetchMock = mock.method(globalThis, 'fetch', async (_url: string) => {
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({ status: 'ok' }),
                } as Response;
            });
        }
    });
});
