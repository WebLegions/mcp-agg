/// <reference lib="dom" />
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';
import type { MCPServerConfig } from '../../shared/types/mcp-config';
import type { McpConfigApp } from '../main';
import type { JurisContext } from '../types/juris';
import { McpConfigPage } from './mcp-config-page';

describe('McpConfigPage Component', () => {
    let mockContext: JurisContext;
    let mockApp: McpConfigApp;
    let stateStore: Record<string, unknown>;

    beforeEach(() => {
        document.body.innerHTML = '';
        stateStore = {
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

    describe('Structure', () => {
        test('should render main container', () => {
            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = McpConfigPage({ app: mockApp }, mockContext) as any;

            assert.ok(vdom.div);
            assert.ok(Array.isArray(vdom.div.children));
            assert.equal(vdom.div.children.length, 2);
        });

        test('should render header with title', () => {
            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = McpConfigPage({ app: mockApp }, mockContext) as any;

            const main = vdom.div.children[0].main;
            const header = main.children[0].header;
            const h1 = header.children[0].h1;

            assert.equal(h1.text, '🔧 MCP Aggregator Configuration');
        });

        test('should render server table section', () => {
            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = McpConfigPage({ app: mockApp }, mockContext) as any;

            const main = vdom.div.children[0].main;
            const tableSection = main.children[2].section;

            assert.ok(tableSection);
            assert.ok(tableSection.children[0].ServerTable);
        });

        test('should render server modal', () => {
            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = McpConfigPage({ app: mockApp }, mockContext) as any;

            const modal = vdom.div.children[1].ServerModal;
            assert.ok(modal);
        });
    });

    describe('Server Statistics', () => {
        test('should display zero stats with no servers', () => {
            stateStore['servers.items'] = [];

            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = McpConfigPage({ app: mockApp }, mockContext) as any;

            const main = vdom.div.children[0].main;
            const statsSection = main.children[1].section;
            const nav = statsSection.children()[0].nav;
            const p = nav.children[0].p;
            const spans = p.children;

            assert.ok(spans[0].span.text.includes('Total: 0'));
            assert.ok(spans[1].span.text.includes('Enabled: 0'));
            assert.ok(spans[2].span.text.includes('Disabled: 0'));
        });

        test('should display correct stats with servers', () => {
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

            stateStore['servers.items'] = servers;

            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = McpConfigPage({ app: mockApp }, mockContext) as any;

            const main = vdom.div.children[0].main;
            const statsSection = main.children[1].section;
            const nav = statsSection.children()[0].nav;
            const p = nav.children[0].p;
            const spans = p.children;

            assert.ok(spans[0].span.text.includes('Total: 3'));
            assert.ok(spans[1].span.text.includes('Enabled: 2'));
            assert.ok(spans[2].span.text.includes('Disabled: 1'));
        });
    });

    describe('Add Server Button', () => {
        test('should render add server button', () => {
            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = McpConfigPage({ app: mockApp }, mockContext) as any;

            const main = vdom.div.children[0].main;
            const statsSection = main.children[1].section;
            const nav = statsSection.children()[0].nav;
            const button = nav.children[1].button;

            assert.equal(button.text, '+ Add Server');
            assert.ok(typeof button.onClick === 'function');
        });

        test('should initialize modal state on add server click', () => {
            let renderCalled = false;
            const mockAppWithRender = {
                render: () => {
                    renderCalled = true;
                },
            } as McpConfigApp;

            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = McpConfigPage({ app: mockAppWithRender }, mockContext) as any;

            const main = vdom.div.children[0].main;
            const statsSection = main.children[1].section;
            const nav = statsSection.children()[0].nav;
            const button = nav.children[1].button;

            button.onClick();

            // Check that state was initialized
            assert.equal(stateStore['ui.serverModalMode'], 'create');
            assert.equal(stateStore['ui.showServerModal'], true);
            assert.equal(stateStore['serverModal.name.value'], '');
            assert.equal(stateStore['serverModal.name.error'], '');
            assert.equal(stateStore['serverModal.transport.value'], 'stdio');
            assert.equal(stateStore['serverModal.command.value'], '');
            assert.equal(stateStore['serverModal.url.value'], '');
            assert.equal(stateStore['serverModal.args.value'], '');
            assert.equal(stateStore['serverModal.enabled.value'], true);
            assert.equal(stateStore['serverModal.description.value'], '');
            assert.equal(stateStore['serverModal.validated'], false);

            // Check that render was called
            assert.ok(renderCalled);
        });
    });
});
