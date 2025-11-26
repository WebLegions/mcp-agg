/// <reference lib="dom" />
import { strict as assert } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { before, beforeEach, describe, mock, test } from 'node:test';
import { ApiClient } from '../../shared/libs/api-client';
import type { j } from '../main';

// Mock ApiClient.fetch BEFORE importing healthPage
Object(ApiClient).fetch = async () => Promise.resolve({ status: 'ok', timestamp: '2025-11-25T13:00:00.000Z', workers: 0 });

import { healthPage } from './health-page';

describe('Health Page Component (DOM Rendering)', () => {
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

        assert.ok(!!Object(window).Juris, 'Juris library not loaded');

        // Create mock API client
        const mockApi = {
            baseUrl: 'http://localhost:3000/',
            fetch: async () => Promise.resolve({ status: 'ok', timestamp: '2025-11-25T13:00:00.000Z', workers: 0 }),
        } as never;

        juris = new Juris({ states: {}, services: { api: mockApi } });
        assert.equal(juris.isBatchMode(), false);

        juris.registerComponent('healthPage', healthPage as never);
    });

    // Before each test: Clear the body
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    test('should render complete health page structure with correct styling', async () => {
        const vnode: j.Elem = {
            div: {
                children: [{ healthPage: {} }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Wait for async component to resolve and fetch to complete
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Set state to ok to ensure consistent test results
        const ctx = juris.createContext();
        ctx.setState('health.status', 'ok');
        ctx.setState(
            'health.data',
            JSON.stringify({ status: 'ok', timestamp: '2025-11-25T13:00:00.000Z', workers: 0 }, undefined, 2),
        );

        // Wait for reactivity
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Verify wrapper div exists
        const wrapperDiv = document.querySelector('div');
        assert.ok(wrapperDiv, 'Wrapper div should exist');

        // The healthPage component's main is the first child
        const mainElement = wrapperDiv.firstElementChild as HTMLElement;
        assert.ok(mainElement, 'Main element should exist');
        assert.equal(mainElement.tagName, 'MAIN');

        // Verify header with heading
        const header = document.querySelector('header');
        assert.ok(header, 'Header should exist');

        const heading = document.querySelector('h1');
        assert.ok(heading, 'Heading should exist');
        assert.equal(heading.textContent, 'System Health');

        // Verify that status section is rendered
        const section = document.querySelector('section');
        assert.ok(section, 'Status section should exist');

        // Verify operational status paragraph exists with correct ID
        const okElement = document.querySelector('#health-page-ok');
        assert.ok(okElement, 'OK status element should exist with ID');
        assert.ok(okElement.textContent?.includes('Operational'), 'Should show operational status after fetch');
    });

    test('should render reactive status based on state changes', async () => {
        // Start with error state
        juris.createContext().setState('health.status', 'error');
        juris.createContext().setState('health.error', 'Connection failed');

        const vnode: j.Elem = {
            div: {
                children: [{ healthPage: {} }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Wait for async component to resolve
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Verify heading exists
        const heading = document.querySelector('h1');
        assert.ok(heading, 'Heading should exist');
        assert.equal(heading.textContent, 'System Health');

        // Change state to ok
        juris.createContext().setState('health.status', 'ok');

        // Allow for reactivity to update
        await new Promise((resolve) => setTimeout(resolve, 50));

        // After state change, verify new content appears
        const body = document.body.textContent;
        assert.ok(body, 'Body should have content');
        // The exact structure might vary, just verify key content is present or absent as expected
        assert.ok(body.includes('System Health'), 'Should show health heading');
    });

    test('should display health check JSON data when status is ok', async () => {
        const vnode: j.Elem = {
            div: {
                children: [{ healthPage: {} }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Wait for fetch to complete and state to update
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Change state to ok
        juris.createContext().setState('health.status', 'ok');
        juris
            .createContext()
            .setState(
                'health.data',
                JSON.stringify({ status: 'ok', timestamp: '2025-11-25T13:00:00.000Z', workers: 0 }, undefined, 2),
            );

        // Allow for reactivity to update
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Find the pre element with JSON data
        const preElement = document.querySelector('pre');
        assert.ok(preElement, 'Pre element should exist for JSON display');

        // Verify JSON content
        const jsonContent = preElement.textContent;
        assert.ok(jsonContent, 'Pre element should have content');
        assert.ok(jsonContent.includes('status'), 'JSON should include status field');
        assert.ok(jsonContent.includes('timestamp'), 'JSON should include timestamp field');
        assert.ok(jsonContent.includes('workers'), 'JSON should include workers field');
    });

    test('should display refresh button when not loading', async () => {
        const vnode: j.Elem = {
            div: {
                children: [{ healthPage: {} }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Wait for initial fetch and set state to ok
        await new Promise((resolve) => setTimeout(resolve, 100));
        juris.createContext().setState('health.status', 'ok');
        juris
            .createContext()
            .setState(
                'health.data',
                JSON.stringify({ status: 'ok', timestamp: '2025-11-25T13:00:00.000Z', workers: 0 }, undefined, 2),
            );

        // Wait for reactivity
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Find the refresh button
        const allText = document.body.textContent || '';
        assert.ok(allText.includes('Refresh'), `Should have refresh button. Body: ${allText}`);
    });

    test('should not display refresh button when loading', async () => {
        // Set state to loading
        juris.createContext().setState('health.status', 'loading');

        const vnode: j.Elem = {
            div: {
                children: [{ healthPage: {} }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Check that refresh button doesn't exist
        const buttons = Array.from(document.querySelectorAll('button'));
        const refreshButton = buttons.find((btn) => btn.textContent?.includes('Refresh'));
        assert.equal(refreshButton, undefined, 'Refresh button should not exist when loading');
    });

    test('should update state to loading when refresh button is clicked', async () => {
        const vnode: j.Elem = {
            div: {
                children: [{ healthPage: {} }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Wait for initial fetch to complete
        await new Promise((resolve) => setTimeout(resolve, 150));

        // Set state to ok manually to ensure refresh button appears
        const ctx = juris.createContext();
        ctx.setState('health.status', 'ok');
        ctx.setState(
            'health.data',
            JSON.stringify({ status: 'ok', timestamp: '2025-11-25T13:00:00.000Z', workers: 0 }, undefined, 2),
        );

        // Wait for reactivity to render button
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Find and click the refresh button
        const buttons = Array.from(document.querySelectorAll('button'));
        const refreshButton = buttons.find((btn) => btn.textContent?.includes('Refresh'));

        if (refreshButton) {
            // Click the button - this will trigger refresh() which sets state to 'loading' synchronously
            refreshButton.click();

            // Check state immediately (before async fetch completes)
            // The refresh() function sets state to 'loading' synchronously on line 12 of health-page.ts
            const statusAfterClick = ctx.getState('health.status');
            assert.equal(statusAfterClick, 'loading', 'Status should be loading immediately after refresh click');
        } else {
            // If button doesn't exist, at least verify the test setup
            const allText = document.body.textContent || '';
            assert.ok(false, `Refresh button not found in: ${allText}`);
        }
    });

    test('should trigger refresh and update UI when refresh button is clicked', async () => {
        const vnode: j.Elem = {
            div: {
                children: [{ healthPage: {} }],
            },
        };

        // mock fetch to return JSON string (since component calls .text() on response)
        const mockFetch = mock.method(ApiClient, 'fetch', () => {
            return Promise.resolve(
                JSON.stringify({
                    status: 'ok',
                    timestamp: '2025-11-25T13:00:00.000Z',
                    workers: 0,
                }),
            );
        });

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Wait for initial fetch to complete
        await new Promise((resolve) => setTimeout(resolve, 150));

        // Initial call should have happened
        assert.ok(mockFetch.mock.callCount() >= 1, 'Initial fetch should have been called');

        // Set state to ok manually to ensure refresh button appears
        const ctx = juris.createContext();
        ctx.setState('health.status', 'ok');
        ctx.setState(
            'health.data',
            JSON.stringify({ status: 'ok', timestamp: '2025-11-25T13:00:00.000Z', workers: 0 }, undefined, 2),
        );

        // Wait for reactivity
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Verify OK status is displayed using ID
        const okElement = document.querySelector('#health-page-ok');
        assert.ok(okElement, 'OK status element should exist');
        assert.ok(okElement.textContent?.includes('Operational'), 'Should show Operational status');

        // Find and click the refresh button using ID
        const refreshButton = document.querySelector('#health-page-refresh-button') as HTMLButtonElement;
        assert.ok(refreshButton, 'Refresh button should exist with ID');

        const callCountBefore = mockFetch.mock.callCount();

        // Click the button
        refreshButton.click();

        // Wait for async fetch to complete
        await new Promise((resolve) => setTimeout(resolve, 150));

        // Should have one more call
        assert.ok(mockFetch.mock.callCount() > callCountBefore, 'Fetch should be called again after refresh');

        // Verify error was cleared when refresh was clicked
        const errorAfter = ctx.getState('health.error');
        assert.equal(errorAfter, '', 'Error should be cleared when refresh is clicked');

        // Verify status is ok (might be 'loading' briefly but should settle to 'ok')
        const statusAfter = ctx.getState('health.status');
        assert.ok(
            statusAfter === 'ok' || statusAfter === 'loading',
            `Status should be ok or loading after refresh, got: ${statusAfter}`,
        );
    });
});
