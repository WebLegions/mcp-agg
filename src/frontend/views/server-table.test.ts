/// <reference lib="dom" />
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';
import type { MCPServerConfig } from '../../shared/types/mcp-config';
import type { McpConfigApp } from '../main';
import type { JurisContext } from '../types/juris';
import { ServerRow, ServerTable } from './server-table';

describe('ServerTable Component', () => {
    let mockContext: JurisContext;
    let mockApp: McpConfigApp;
    let stateStore: Record<string, unknown>;

    beforeEach(() => {
        document.body.innerHTML = '';
        stateStore = {
            'servers.loading': false,
            'servers.error': '',
            'servers.items': [],
        };

        mockContext = {
            getState: <T>(key: string, defaultValue?: T): T => {
                return (stateStore[key] ?? defaultValue) as T;
            },
            setState: (key: string, value: unknown) => {
                stateStore[key] = value;
            },
            headlessAPIs: {},
            executeBatch: (callback: () => unknown) => callback(),
        } as JurisContext;

        mockApp = {
            render: () => {},
        } as McpConfigApp;
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('Loading State', () => {
        test('should show loading message when loading', () => {
            stateStore['servers.loading'] = true;

            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = ServerTable({ app: mockApp }, mockContext) as any;

            assert.ok(vdom.div);
            assert.equal(vdom.div.children[0].p.text, 'Loading servers...');
        });
    });

    describe('Error State', () => {
        test('should show error message when error exists', () => {
            stateStore['servers.loading'] = false;
            stateStore['servers.error'] = 'Failed to load servers';

            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = ServerTable({ app: mockApp }, mockContext) as any;

            assert.ok(vdom.div);
            assert.equal(vdom.div.children[0].p.text, 'Error: Failed to load servers');
            assert.equal(vdom.div.children[0].p.style, 'color: red;');
        });
    });

    describe('Empty State', () => {
        test('should show empty message when no servers', () => {
            stateStore['servers.loading'] = false;
            stateStore['servers.error'] = '';
            stateStore['servers.items'] = [];

            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = ServerTable({ app: mockApp }, mockContext) as any;

            assert.ok(vdom.div);
            assert.ok(vdom.div.children[0].p.text.includes('No servers configured'));
            assert.ok(vdom.div.children[0].p.text.includes('Add Server'));
        });
    });

    describe('Table Rendering', () => {
        test('should render table with headers when servers exist', () => {
            const servers: MCPServerConfig[] = [
                {
                    name: 'test-server',
                    transport: 'stdio',
                    command: 'node',
                    enabled: true,
                },
            ];

            stateStore['servers.items'] = servers;

            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = ServerTable({ app: mockApp }, mockContext) as any;

            const table = vdom.div.children[0].table;
            assert.ok(table);

            const thead = table.children[0].thead;
            const headerRow = thead.children[0].tr;
            const headers = headerRow.children;

            assert.equal(headers.length, 6);
            assert.equal(headers[0].th.text, 'NAME');
            assert.equal(headers[1].th.text, 'STATUS');
            assert.equal(headers[2].th.text, 'TRANSPORT');
            assert.equal(headers[3].th.text, 'COMMAND/URL');
            assert.equal(headers[4].th.text, 'DESCRIPTION');
            assert.equal(headers[5].th.text, 'ACTIONS');
        });

        test('should render table body with ServerRow components', () => {
            const servers: MCPServerConfig[] = [
                {
                    name: 'server1',
                    transport: 'stdio',
                    command: 'node',
                    enabled: true,
                },
                {
                    name: 'server2',
                    transport: 'sse',
                    url: 'http://test.com',
                    enabled: false,
                },
            ];

            stateStore['servers.items'] = servers;

            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = ServerTable({ app: mockApp }, mockContext) as any;

            const tbody = vdom.div.children[0].table.children[1].tbody;
            assert.ok(tbody);
            assert.equal(tbody.children.length, 2);
            assert.ok(tbody.children[0].ServerRow);
            assert.ok(tbody.children[1].ServerRow);
        });
    });
});

describe('ServerRow Component', () => {
    let mockContext: JurisContext;
    let mockApp: McpConfigApp;
    let stateStore: Record<string, unknown>;

    beforeEach(() => {
        document.body.innerHTML = '';
        stateStore = {};

        mockContext = {
            getState: <T>(key: string, defaultValue?: T): T => {
                return (stateStore[key] ?? defaultValue) as T;
            },
            setState: (key: string, value: unknown) => {
                stateStore[key] = value;
            },
            headlessAPIs: {},
            executeBatch: (callback: () => unknown) => callback(),
        } as JurisContext;

        mockApp = {
            render: () => {},
        } as McpConfigApp;
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('Stdio Server Rendering', () => {
        test('should render stdio server correctly', () => {
            const server: MCPServerConfig = {
                name: 'test-server',
                transport: 'stdio',
                command: 'node',
                args: ['server.js', '--port', '3000'],
                enabled: true,
                description: 'Test server',
            };

            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = ServerRow({ app: mockApp, server }, mockContext) as any;

            assert.equal(vdom.tr.id, 'server-row-test-server');

            const cells = vdom.tr.children;
            assert.equal(cells.length, 6);

            // Name cell
            assert.equal(cells[0].td.children[0].strong.text, 'test-server');

            // Status cell
            assert.equal(cells[1].td.children[0].span.text, '✓ Enabled');

            // Transport cell
            assert.equal(cells[2].td.children[0].code.text, 'STDIO');

            // Command cell
            assert.ok(cells[3].td.children[0].code.text.includes('node'));
            assert.ok(cells[3].td.children[0].code.text.includes('server.js'));

            // Description cell
            assert.equal(cells[4].td.text, 'Test server');
        });

        test('should show disabled status for disabled server', () => {
            const server: MCPServerConfig = {
                name: 'disabled-server',
                transport: 'stdio',
                command: 'node',
                enabled: false,
            };

            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = ServerRow({ app: mockApp, server }, mockContext) as any;

            const statusCell = vdom.tr.children[1];
            assert.equal(statusCell.td.children[0].span.text, '✗ Disabled');
        });
    });

    describe('SSE Server Rendering', () => {
        test('should render SSE server correctly', () => {
            const server: MCPServerConfig = {
                name: 'sse-server',
                transport: 'sse',
                url: 'https://example.com/sse',
                enabled: true,
            };

            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = ServerRow({ app: mockApp, server }, mockContext) as any;

            const cells = vdom.tr.children;

            // Transport cell
            assert.equal(cells[2].td.children[0].code.text, 'SSE');

            // URL cell
            assert.equal(cells[3].td.children[0].code.text, 'https://example.com/sse');
        });
    });

    describe('HTTP Server Rendering', () => {
        test('should render HTTP server correctly', () => {
            const server: MCPServerConfig = {
                name: 'http-server',
                transport: 'http',
                url: 'http://localhost:8080',
                enabled: true,
            };

            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = ServerRow({ app: mockApp, server }, mockContext) as any;

            const cells = vdom.tr.children;

            // Transport cell
            assert.equal(cells[2].td.children[0].code.text, 'HTTP');

            // URL cell
            assert.equal(cells[3].td.children[0].code.text, 'http://localhost:8080');
        });
    });

    describe('Empty Description', () => {
        test('should show dash for empty description', () => {
            const server: MCPServerConfig = {
                name: 'no-desc-server',
                transport: 'stdio',
                command: 'test',
                enabled: true,
            };

            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = ServerRow({ app: mockApp, server }, mockContext) as any;

            const descriptionCell = vdom.tr.children[4];
            assert.equal(descriptionCell.td.text, '-');
        });
    });

    describe('Actions Menu', () => {
        test('should render dropdown menu for actions', () => {
            const server: MCPServerConfig = {
                name: 'action-server',
                transport: 'stdio',
                command: 'test',
                enabled: true,
            };

            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = ServerRow({ app: mockApp, server }, mockContext) as any;

            const actionsCell = vdom.tr.children[5];
            const dropdown = actionsCell.td.children[0].DropdownMenu;

            assert.ok(dropdown);
            assert.equal(dropdown.id, 'server-actions-action-server');
            assert.equal(dropdown.align, 'end');
            assert.ok(dropdown.trigger.Icon);
            assert.ok(Array.isArray(dropdown.children));
            assert.ok(dropdown.children.length >= 2);
        });

        test('should have edit action in dropdown', () => {
            const server: MCPServerConfig = {
                name: 'edit-test',
                transport: 'stdio',
                command: 'node',
                args: ['test.js'],
                enabled: true,
                description: 'Test',
            };

            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = ServerRow({ app: mockApp, server }, mockContext) as any;

            const dropdown = vdom.tr.children[5].td.children[0].DropdownMenu;
            const editItem = dropdown.children[0].DropdownMenuItem;

            assert.equal(editItem.text, 'Edit');
            assert.ok(typeof editItem.onClick === 'function');
        });

        test('should initialize edit modal state correctly', () => {
            const server: MCPServerConfig = {
                name: 'edit-server',
                transport: 'stdio',
                command: 'node',
                args: ['server.js'],
                enabled: true,
                description: 'My server',
            };

            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = ServerRow({ app: mockApp, server }, mockContext) as any;

            const dropdown = vdom.tr.children[5].td.children[0].DropdownMenu;
            const editItem = dropdown.children[0].DropdownMenuItem;

            editItem.onClick();

            assert.equal(stateStore['ui.serverModalMode'], 'edit');
            assert.equal(stateStore['ui.showServerModal'], true);
            assert.equal(stateStore['serverModal.name.value'], 'edit-server');
            assert.equal(stateStore['serverModal.transport.value'], 'stdio');
            assert.equal(stateStore['serverModal.command.value'], 'node');
            assert.equal(stateStore['serverModal.args.value'], 'server.js');
            assert.equal(stateStore['serverModal.enabled.value'], true);
            assert.equal(stateStore['serverModal.description.value'], 'My server');
        });
    });
});
