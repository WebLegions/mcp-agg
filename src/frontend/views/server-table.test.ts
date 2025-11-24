/// <reference lib="dom" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { before, beforeEach, describe, test } from 'node:test';
import type { MCPServerConfig } from '../../shared/types/mcp-config';
import type { JurisInstance, JurisVDOMElement } from '../types/juris';
import { serverRow, serverTable } from './server-table';

describe('Server Table Component (DOM Rendering)', () => {
    let juris: JurisInstance;

    before(() => {
        // Load Juris via script tag
        const jurisPath = resolve(process.cwd(), 'node_modules/juris/juris.js');
        const jurisCode = readFileSync(jurisPath, 'utf-8');
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.textContent = jurisCode;
        document.head.appendChild(script);

        // Execute script in window context
        Object(window).eval(jurisCode);

        // Initialize Juris
        juris = new Juris({
            states: {
                'servers.loading': false,
                'servers.error': '',
                'servers.items': [],
            },
        });

        // Register components
        juris.registerComponent('serverTable', serverTable as never);
        juris.registerComponent('serverRow', serverRow as never);

        // Register stub components
        juris.registerComponent('menu', (() => ({ div: { class: 'menu-stub' } })) as never);
        juris.registerComponent('icon', (() => ({ div: { class: 'icon-stub' } })) as never);
    });

    beforeEach(() => {
        document.body.innerHTML = '';
        juris.createContext().setState('servers.loading', false);
        juris.createContext().setState('servers.error', '');
        juris.createContext().setState('servers.items', []);
    });

    test('should render loading state', () => {
        juris.createContext().setState('servers.loading', true);

        const vnode: JurisVDOMElement = {
            div: {
                children: [{ serverTable: {} }],
            },
        };
        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        const paragraph = document.querySelector('p');
        assert.ok(paragraph, 'Expected loading paragraph to exist');
        assert.equal(paragraph.textContent, 'Loading servers...');
    });

    test('should render error state', () => {
        juris.createContext().setState('servers.loading', false);
        juris.createContext().setState('servers.error', 'Failed to load servers');

        const vnode: JurisVDOMElement = {
            div: {
                children: [{ serverTable: {} }],
            },
        };
        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        const paragraph = document.querySelector('p');
        assert.ok(paragraph, 'Expected error paragraph to exist');
        assert.equal(paragraph.textContent, 'Error: Failed to load servers');
    });

    test('should render empty state', () => {
        juris.createContext().setState('servers.loading', false);
        juris.createContext().setState('servers.error', '');
        juris.createContext().setState('servers.items', []);

        const vnode: JurisVDOMElement = {
            div: {
                children: [{ serverTable: {} }],
            },
        };
        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        const paragraph = document.querySelector('p');
        assert.ok(paragraph, 'Expected empty state paragraph to exist');
        const text = paragraph.textContent || '';
        assert.ok(text.includes('No servers configured'));
        assert.ok(text.includes('Add Server'));
    });

    test('should render table with headers and rows when servers exist', () => {
        const servers: MCPServerConfig[] = [
            {
                name: 'test-server-1',
                transport: 'stdio',
                command: 'node',
                args: ['server.js'],
                enabled: true,
                description: 'Test server 1',
            },
            {
                name: 'test-server-2',
                transport: 'sse',
                url: 'https://example.com/sse',
                enabled: false,
                description: 'Test server 2',
            },
        ];

        juris.createContext().setState('servers.items', servers);

        const vnode: JurisVDOMElement = {
            div: {
                children: [{ serverTable: {} }],
            },
        };
        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Check table exists
        const table = document.querySelector('table');
        assert.ok(table, 'Expected table to exist');

        // Check headers
        const headers = document.querySelectorAll('thead th');
        assert.equal(headers.length, 6);
        assert.equal(headers[0].textContent, 'NAME');
        assert.equal(headers[1].textContent, 'STATUS');
        assert.equal(headers[2].textContent, 'TRANSPORT');
        assert.equal(headers[3].textContent, 'COMMAND/URL');
        assert.equal(headers[4].textContent, 'DESCRIPTION');
        assert.equal(headers[5].textContent, 'ACTIONS');

        // Check rows exist (2 servers)
        const rows = document.querySelectorAll('tbody tr');
        assert.equal(rows.length, 2);
        assert.equal(rows[0].id, 'server-row-test-server-1');
        assert.equal(rows[1].id, 'server-row-test-server-2');
    });
});

describe('Server Row Component (DOM Rendering)', () => {
    let juris: JurisInstance;

    before(() => {
        // Load Juris via script tag
        const jurisPath = resolve(process.cwd(), 'node_modules/juris/juris.js');
        const jurisCode = readFileSync(jurisPath, 'utf-8');
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.textContent = jurisCode;
        document.head.appendChild(script);

        // Execute script in window context
        Object(window).eval(jurisCode);

        // Initialize Juris
        juris = new Juris({ states: {} });

        // Register component
        juris.registerComponent('serverRow', serverRow as never);

        // Register stub components
        juris.registerComponent('menu', (() => ({ div: { class: 'menu-stub' } })) as never);
        juris.registerComponent('icon', (() => ({ div: { class: 'icon-stub' } })) as never);
    });

    beforeEach(() => {
        document.body.innerHTML = '';
    });

    test('should render stdio server with enabled status', () => {
        const server: MCPServerConfig = {
            name: 'test-stdio-server',
            transport: 'stdio',
            command: 'node',
            args: ['server.js', '--port', '3000'],
            enabled: true,
            description: 'Test stdio server',
        };

        const vnode: JurisVDOMElement = {
            table: {
                children: [
                    {
                        tbody: {
                            children: [{ serverRow: { server } }],
                        },
                    },
                ],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        const row = document.querySelector('tr');
        assert.ok(row, 'Expected row to exist');
        assert.equal(row.id, 'server-row-test-stdio-server');

        const cells = row.querySelectorAll('td');
        assert.equal(cells.length, 6);

        // Name cell
        const nameStrong = cells[0].querySelector('strong');
        assert.ok(nameStrong);
        assert.equal(nameStrong.textContent, 'test-stdio-server');

        // Status cell
        const statusSpan = cells[1].querySelector('span');
        assert.ok(statusSpan);
        assert.equal(statusSpan.textContent, '✓ Enabled');

        // Transport cell
        const transportCode = cells[2].querySelector('code');
        assert.ok(transportCode);
        assert.equal(transportCode.textContent, 'STDIO');

        // Command cell
        const commandCode = cells[3].querySelector('code');
        assert.ok(commandCode);
        const cmdText = commandCode.textContent || '';
        assert.ok(cmdText.includes('node'));
        assert.ok(cmdText.includes('server.js'));

        // Description cell
        assert.equal(cells[4].textContent, 'Test stdio server');

        // Actions cell (menu stub)
        const menuStub = cells[5].querySelector('.menu-stub');
        assert.ok(menuStub);
    });

    test('should render disabled server status', () => {
        const server: MCPServerConfig = {
            name: 'disabled-server',
            transport: 'stdio',
            command: 'node',
            enabled: false,
        };

        const vnode: JurisVDOMElement = {
            table: {
                children: [
                    {
                        tbody: {
                            children: [{ serverRow: { server } }],
                        },
                    },
                ],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        const row = document.querySelector('tr');
        assert.ok(row);

        const statusCell = row.querySelectorAll('td')[1];
        const statusSpan = statusCell.querySelector('span');
        assert.ok(statusSpan);
        assert.equal(statusSpan.textContent, '✗ Disabled');
    });

    test('should render SSE server with URL', () => {
        const server: MCPServerConfig = {
            name: 'sse-server',
            transport: 'sse',
            url: 'https://example.com/sse',
            enabled: true,
        };

        const vnode: JurisVDOMElement = {
            table: {
                children: [
                    {
                        tbody: {
                            children: [{ serverRow: { server } }],
                        },
                    },
                ],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        const row = document.querySelector('tr');
        assert.ok(row);

        const cells = row.querySelectorAll('td');

        // Transport cell
        const transportCode = cells[2].querySelector('code');
        assert.ok(transportCode);
        assert.equal(transportCode.textContent, 'SSE');

        // URL cell
        const urlCode = cells[3].querySelector('code');
        assert.ok(urlCode);
        assert.equal(urlCode.textContent, 'https://example.com/sse');
    });

    test('should render HTTP server with URL', () => {
        const server: MCPServerConfig = {
            name: 'http-server',
            transport: 'http',
            url: 'http://localhost:8080',
            enabled: true,
        };

        const vnode: JurisVDOMElement = {
            table: {
                children: [
                    {
                        tbody: {
                            children: [{ serverRow: { server } }],
                        },
                    },
                ],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        const row = document.querySelector('tr');
        assert.ok(row);

        const cells = row.querySelectorAll('td');

        // Transport cell
        const transportCode = cells[2].querySelector('code');
        assert.ok(transportCode);
        assert.equal(transportCode.textContent, 'HTTP');

        // URL cell
        const urlCode = cells[3].querySelector('code');
        assert.ok(urlCode);
        assert.equal(urlCode.textContent, 'http://localhost:8080');
    });

    test('should show dash for empty description', () => {
        const server: MCPServerConfig = {
            name: 'no-desc-server',
            transport: 'stdio',
            command: 'test',
            enabled: true,
        };

        const vnode: JurisVDOMElement = {
            table: {
                children: [
                    {
                        tbody: {
                            children: [{ serverRow: { server } }],
                        },
                    },
                ],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        const row = document.querySelector('tr');
        assert.ok(row);

        const descriptionCell = row.querySelectorAll('td')[4];
        assert.equal(descriptionCell.textContent, '-');
    });
});
