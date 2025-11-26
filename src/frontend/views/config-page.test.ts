/// <reference lib="dom" />
import { strict as assert } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { before, beforeEach, describe, test } from 'node:test';
import type { MCPServerConfig } from '../../shared/types/mcp-config';
import { icon } from '../components/icon';
import { menu } from '../components/menu';
import type { j } from '../main';
import { configPage, serverRow } from './config-page';

describe('Config Page Component (DOM Rendering)', () => {
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

        juris = new Juris({ states: { 'servers.items': [] } });
        juris.registerComponent('icon', icon as never);
        juris.registerComponent('menu', menu as never);
        juris.registerComponent('configPage', configPage as never);
        juris.registerComponent('serverRow', serverRow as never);
    });

    // Before each test: Clear the body
    beforeEach(() => {
        document.body.innerHTML = '';
        // Reset state
        juris.createContext().setState('servers.items', []);
    });

    test('should render complete page structure with header, stats, and server table', () => {
        const vnode: j.Elem = {
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
        assert.equal(sections.length, 1, 'Should have 1 section (stats only)');
        const statsSection = sections[0];
        const statsP = statsSection.querySelector('p');
        assert.ok(statsP, 'Stats paragraph should exist in stats section');

        const spans = statsP.querySelectorAll('span');
        assert.ok(spans.length >= 3, 'Should have at least 3 spans for stats');
        assert.ok(statsP.textContent?.includes('Total: 0'));
        assert.ok(statsP.textContent?.includes('Enabled: 0'));
        assert.ok(statsP.textContent?.includes('Disabled: 0'));

        // Verify add server button
        const button = statsP.querySelector('button');
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

        const vnode: j.Elem = {
            div: {
                children: [{ configPage: {} }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Verify stats with servers
        const statsP = document.querySelector('section p');
        assert.ok(statsP, 'Stats paragraph should exist');
        const spans = statsP.querySelectorAll('span');
        assert.ok(spans.length >= 3, 'Should have at least 3 spans for stats');
        assert.ok(statsP.textContent?.includes('Total: 3'));
        assert.ok(statsP.textContent?.includes('Enabled: 2'));
        assert.ok(statsP.textContent?.includes('Disabled: 1'));

        // Verify button click sets modal state
        const button = statsP.querySelector('button');
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

    test('should reactively update DOM when server state changes', () => {
        // Start with no servers
        const ctx = juris.createContext();
        ctx.setState('servers.items', []);
        ctx.setState('servers.loading', false);

        const vnode: j.Elem = {
            div: {
                children: [{ configPage: {} }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Initial state: Total: 0
        let statsP = document.querySelector('section p');
        assert.ok(statsP, 'Stats paragraph should exist');
        assert.ok(statsP.textContent?.includes('Total: 0'), 'Should show 0 servers initially');

        // Change state: add servers
        const servers: MCPServerConfig[] = [
            {
                name: 'test-server',
                transport: 'stdio',
                command: 'test',
                enabled: true,
            },
        ];
        ctx.setState('servers.items', servers);

        // Verify DOM updated
        statsP = document.querySelector('section p');
        assert.ok(statsP, 'Stats paragraph should still exist after update');
        assert.ok(statsP.textContent?.includes('Total: 1'), 'Should show 1 server after state change');
        assert.ok(statsP.textContent?.includes('Enabled: 1'), 'Should show 1 enabled after state change');
    });

    test('should render server rows when servers exist', () => {
        const servers: MCPServerConfig[] = [
            {
                name: 'test-server',
                transport: 'stdio',
                command: 'node',
                args: ['server.js'],
                enabled: true,
                description: 'Test server',
            },
        ];

        const ctx = juris.createContext();
        ctx.setState('servers.items', servers);

        const vnode: j.Elem = {
            div: {
                children: [{ configPage: {} }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Verify table row exists
        const tbody = document.querySelector('tbody');
        assert.ok(tbody, 'Table body should exist');
        const rows = tbody.querySelectorAll('tr');
        assert.equal(rows.length, 1, 'Should have 1 server row');
    });

    test('should show empty state when no servers', () => {
        const ctx = juris.createContext();
        ctx.setState('servers.items', []);

        const vnode: j.Elem = {
            div: {
                children: [{ configPage: {} }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Should not have tbody when no servers
        const tbody = document.querySelector('tbody');
        assert.equal(tbody, null, 'Should not have table body when no servers');
    });

    test('should show loading state correctly', () => {
        // Set state before rendering
        juris.createContext().setState('servers.loading', true);
        juris.createContext().setState('servers.items', []);

        const vnode: j.Elem = {
            div: {
                children: [{ configPage: {} }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Check for loading text in any paragraph
        const allText = document.body.textContent || '';
        assert.ok(allText.includes('Loading servers'), `Should show loading text. Got: ${allText}`);
    });

    test('should show error state correctly', () => {
        // Set state before rendering
        juris.createContext().setState('servers.loading', false);
        juris.createContext().setState('servers.error', 'Failed to load servers');
        juris.createContext().setState('servers.items', []);

        const vnode: j.Elem = {
            div: {
                children: [{ configPage: {} }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Check for error text in the document
        const allText = document.body.textContent || '';
        assert.ok(
            allText.includes('Error') && allText.includes('Failed to load servers'),
            `Should show error text with message. Got: ${allText}`,
        );
    });

    test('serverRow component renders server information correctly', () => {
        const server: MCPServerConfig = {
            name: 'my-server',
            transport: 'stdio',
            command: 'bun',
            args: ['run', 'server'],
            enabled: true,
            description: 'My test server',
        };

        const vnode: j.Elem = {
            tbody: {
                children: [
                    {
                        serverRow: {
                            server,
                            onEdit: () => {},
                            onToggleEnabled: () => {},
                            onDelete: () => {},
                        },
                    },
                ],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        const row = document.querySelector('tr');
        assert.ok(row, 'Table row should exist');

        const cells = row.querySelectorAll('td');
        assert.ok(cells.length >= 3, 'Should have at least 3 cells');

        // Check server name
        assert.ok(row.textContent?.includes('my-server'), 'Should display server name');

        // Check transport type (displayed in uppercase)
        assert.ok(row.textContent?.includes('STDIO'), 'Should display transport type in uppercase');

        // Check enabled status
        assert.ok(row.textContent?.includes('✓') && row.textContent?.includes('Enabled'), 'Should show enabled status');
    });

    test('serverRow component shows disabled status correctly', () => {
        const server: MCPServerConfig = {
            name: 'disabled-server',
            transport: 'sse',
            url: 'https://example.com/sse',
            enabled: false,
        };

        const vnode: j.Elem = {
            tbody: {
                children: [
                    {
                        serverRow: {
                            server,
                            onEdit: () => {},
                            onToggleEnabled: () => {},
                            onDelete: () => {},
                        },
                    },
                ],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        const row = document.querySelector('tr');
        assert.ok(row, 'Table row should exist');

        // Check disabled status
        assert.ok(row.textContent?.includes('✗') || row.textContent?.includes('Disabled'), 'Should show disabled status');
    });

    test('serverRow component displays different transport types correctly', () => {
        const servers: MCPServerConfig[] = [
            {
                name: 'stdio-server',
                transport: 'stdio',
                command: 'node',
                enabled: true,
            },
            {
                name: 'sse-server',
                transport: 'sse',
                url: 'https://example.com/sse',
                enabled: true,
            },
            {
                name: 'http-server',
                transport: 'http',
                url: 'https://example.com/api',
                enabled: true,
            },
        ];

        for (const server of servers) {
            document.body.innerHTML = '';

            const vnode: j.Elem = {
                tbody: {
                    children: [
                        {
                            serverRow: {
                                server,
                                onEdit: () => {},
                                onToggleEnabled: () => {},
                                onDelete: () => {},
                            },
                        },
                    ],
                },
            };

            const element = juris.objectToHtml(vnode);
            document.body.appendChild(element as Node);

            const row = document.querySelector('tr');
            assert.ok(row, `Table row should exist for ${server.transport}`);
            assert.ok(
                row.textContent?.includes(server.transport.toUpperCase()),
                `Should display ${server.transport.toUpperCase()} transport`,
            );
        }
    });

    test('serverRow component displays command and args for stdio transport', () => {
        const server: MCPServerConfig = {
            name: 'stdio-server',
            transport: 'stdio',
            command: 'node',
            args: ['server.js', '--port', '3000'],
            enabled: true,
        };

        const vnode: j.Elem = {
            tbody: {
                children: [
                    {
                        serverRow: {
                            server,
                            onEdit: () => {},
                            onToggleEnabled: () => {},
                            onDelete: () => {},
                        },
                    },
                ],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        const row = document.querySelector('tr');
        assert.ok(row, 'Table row should exist');
        assert.ok(row.textContent?.includes('node'), 'Should display command');
    });

    test('serverRow component displays URL for HTTP/SSE transports', () => {
        const server: MCPServerConfig = {
            name: 'sse-server',
            transport: 'sse',
            url: 'https://api.example.com/sse',
            enabled: true,
        };

        const vnode: j.Elem = {
            tbody: {
                children: [
                    {
                        serverRow: {
                            server,
                            onEdit: () => {},
                            onToggleEnabled: () => {},
                            onDelete: () => {},
                        },
                    },
                ],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        const row = document.querySelector('tr');
        assert.ok(row, 'Table row should exist');
        assert.ok(row.textContent?.includes('https://api.example.com/sse'), 'Should display URL');
    });

    test('should update state when add server button is clicked', () => {
        const ctx = juris.createContext();

        // Set up initial state with servers
        ctx.setState('servers.items', [
            {
                name: 'test-server',
                transport: 'stdio',
                command: 'node',
                args: ['server.js'],
                enabled: true,
            },
        ]);
        ctx.setState('servers.loading', false);

        const vnode: j.Elem = {
            div: {
                children: [{ configPage: {} }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Find the add server button using ID
        const addButton = document.querySelector('#config-page-add-server-button') as HTMLButtonElement;
        assert.ok(addButton, 'Add server button should exist');
        assert.equal(addButton.textContent, '+ Add Server', 'Button should have correct text');

        // Click the button
        addButton.click();

        // Verify state changes
        assert.equal(ctx.getState('ui.serverModalMode'), 'create', 'Modal mode should be set to create');
        assert.equal(ctx.getState('ui.showServerModal'), true, 'Modal should be shown');
        assert.equal(ctx.getState('serverModal.name.value'), '', 'Name field should be cleared');
        assert.equal(ctx.getState('serverModal.transport.value'), 'stdio', 'Transport should be set to stdio');
        assert.equal(ctx.getState('serverModal.command.value'), '', 'Command field should be cleared');
    });

    test('should open row menu and handle edit action', () => {
        const ctx = juris.createContext();

        // Set up test server
        const testServer = {
            name: 'test-server',
            transport: 'stdio' as const,
            command: 'node',
            args: ['server.js'],
            enabled: true,
            description: 'Test server description',
        };

        ctx.setState('servers.items', [testServer]);
        ctx.setState('servers.loading', false);

        const vnode: j.Elem = {
            div: {
                children: [{ configPage: {} }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Find the menu icon button in the server row by aria-label
        const icons = Array.from(document.querySelectorAll('[aria-label="Server actions"]'));
        assert.ok(icons.length > 0, 'Menu icon should exist');
        const menuIcon = icons[0] as HTMLElement;

        assert.ok(menuIcon, 'Menu icon should exist');

        // Click the menu icon to open the menu
        menuIcon.click();

        // Verify menu state is set
        const menuId = ctx.getState('servers.menuId');
        assert.deepEqual(menuId, testServer, 'Menu ID should be set to the test server');

        // Wait for menu to render
        const menu = document.querySelector('article[role="menu"]');
        assert.ok(menu, 'Menu should be rendered');

        // Find and click the Edit menu item (menu items are divs with class "menu-item")
        const menuItems = Array.from(menu.querySelectorAll('.menu-item'));
        const editItem = menuItems.find((item) => item.textContent?.includes('Edit')) as HTMLElement;
        assert.ok(editItem, 'Edit menu item should exist');

        // Click the edit item
        editItem.click();

        // Verify edit action state changes
        assert.equal(ctx.getState('ui.serverModalMode'), 'edit', 'Modal mode should be set to edit');
        assert.equal(ctx.getState('ui.showServerModal'), true, 'Modal should be shown');
        assert.equal(ctx.getState('serverModal.name.value'), testServer.name, 'Name should be populated');
        assert.equal(ctx.getState('serverModal.command.value'), testServer.command, 'Command should be populated');
        assert.deepEqual(ctx.getState('serverModal.args.value'), testServer.args.join(' '), 'Args should be populated');
        assert.equal(ctx.getState('servers.menuId'), '', 'Menu should be closed after edit click');
    });
});
