/// <reference lib="dom" />
import { strict as assert } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { before, beforeEach, describe, test } from 'node:test';
import type { MCPServerConfig } from '../../shared/types/mcp-config';
import type { JurisInstance, JurisVDOMElement } from '../types/juris';
import { configPage } from './config-page';

describe('Config Page Component (DOM Rendering)', () => {
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

        juris = new Juris({ states: { 'servers.items': [] } });
        juris.registerComponent('configPage', configPage as never);
    });

    // Before each test: Clear the body
    beforeEach(() => {
        document.body.innerHTML = '';
        // Reset state
        juris.createContext().setState('servers.items', []);
    });

    test('should render complete page structure with header, stats, and server table', () => {
        const vnode: JurisVDOMElement = {
            div: {
                children: [{ configPage: {} }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Verify header
        const header = document.querySelector('header');
        assert.ok(header, 'Header should exist');
        const h1 = header.querySelector('h1');
        assert.ok(h1, 'H1 should exist');
        assert.equal(h1.textContent, '🔧 MCP Aggregator Configuration');

        // Verify stats section with zero servers
        const sections = document.querySelectorAll('section');
        assert.equal(sections.length, 2, 'Should have 2 sections');
        const statsSection = sections[0];
        const nav = statsSection.querySelector('nav');
        assert.ok(nav, 'Nav should exist in stats section');

        const spans = nav.querySelectorAll('span');
        assert.equal(spans.length, 3, 'Should have 3 stat spans');
        assert.ok(spans[0].textContent?.includes('Total: 0'));
        assert.ok(spans[1].textContent?.includes('Enabled: 0'));
        assert.ok(spans[2].textContent?.includes('Disabled: 0'));

        // Verify add server button
        const button = nav.querySelector('button');
        assert.ok(button, 'Add server button should exist');
        assert.equal(button.textContent, '+ Add Server');
    });

    test('should display correct server statistics and handle button clicks', () => {
        const servers: MCPServerConfig[] = [
            {
                name: 'server1',
                transport: 'stdio',
                command: 'test',
                enabled: true,
            },
            {
                name: 'server2',
                transport: 'stdio',
                command: 'test2',
                enabled: false,
            },
            {
                name: 'server3',
                transport: 'sse',
                url: 'http://test.com',
                enabled: true,
            },
        ];

        juris.createContext().setState('servers.items', servers);

        const vnode: JurisVDOMElement = {
            div: {
                children: [{ configPage: {} }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Verify stats with servers
        const nav = document.querySelector('nav');
        assert.ok(nav, 'Nav should exist');
        const spans = nav.querySelectorAll('span');
        assert.ok(spans[0].textContent?.includes('Total: 3'));
        assert.ok(spans[1].textContent?.includes('Enabled: 2'));
        assert.ok(spans[2].textContent?.includes('Disabled: 1'));

        // Verify button click sets modal state
        const button = nav.querySelector('button');
        assert.ok(button, 'Add server button should exist');

        // Click the button
        button.click();

        // Verify state was set correctly
        assert.equal(juris.createContext().getState('ui.serverModalMode'), 'create');
        assert.equal(juris.createContext().getState('ui.showServerModal'), true);
        assert.equal(juris.createContext().getState('serverModal.name.value'), '');
        assert.equal(juris.createContext().getState('serverModal.transport.value'), 'stdio');
        assert.equal(juris.createContext().getState('serverModal.enabled.value'), true);
        assert.equal(juris.createContext().getState('serverModal.validated'), false);
    });
});
