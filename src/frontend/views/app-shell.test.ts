/// <reference lib="dom" />
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';
import type { McpConfigApp } from '../main';
import type { JurisContext } from '../types/juris';
import { AppShell } from './app-shell';

describe('AppShell Component', () => {
    let mockContext: JurisContext;
    let mockApp: McpConfigApp;

    beforeEach(() => {
        document.body.innerHTML = '';
        mockContext = {
            getState: <T>(_key: string, defaultValue?: T): T => defaultValue as T,
            setState: (_key: string, _value: unknown) => {},
            headlessAPIs: {},
            executeBatch: (callback: () => unknown) => callback(),
        } as JurisContext;

        mockApp = {} as McpConfigApp;
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('Structure', () => {
        test('should render main container div', () => {
            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = AppShell({ app: mockApp }, mockContext) as any;

            assert.ok(vdom.div);
            assert.ok(Array.isArray(vdom.div.children));
        });

        test('should render header with navigation', () => {
            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = AppShell({ app: mockApp }, mockContext) as any;

            const header = vdom.div.children[0].header;
            assert.ok(header);
            assert.ok(header.children);

            const nav = header.children[0].nav;
            assert.ok(nav);
            assert.ok(Array.isArray(nav.children));
            assert.equal(nav.children.length, 3);
        });

        test('should have navigation links', () => {
            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = AppShell({ app: mockApp }, mockContext) as any;

            const nav = vdom.div.children[0].header.children[0].nav;
            const links = nav.children;

            assert.equal(links[0].a.href, '#servers');
            assert.equal(links[0].a.text, 'Servers');

            assert.equal(links[1].a.href, '#tools');
            assert.equal(links[1].a.text, 'Tools');

            assert.equal(links[2].a.href, '#resources');
            assert.equal(links[2].a.text, 'Resources');
        });

        test('should render main content area', () => {
            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = AppShell({ app: mockApp }, mockContext) as any;

            const main = vdom.div.children[1].main;
            assert.ok(main);
            assert.ok(Array.isArray(main.children));
            assert.equal(main.children.length, 1);
            assert.ok(main.children[0].McpConfigPage);
        });

        test('should render footer with GitHub link', () => {
            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = AppShell({ app: mockApp }, mockContext) as any;

            const footer = vdom.div.children[2].footer;
            assert.ok(footer);

            const footerContent = footer.children[0].div.children;
            assert.ok(footerContent[0].span);
            assert.equal(footerContent[0].span.text, 'MCP Aggregator • ');

            const githubLink = footerContent[1].a;
            assert.equal(githubLink.href, 'https://github.com/eram/mcp-agg');
            assert.equal(githubLink.target, '_blank');
            assert.equal(githubLink.rel, 'noopener noreferrer');
            assert.equal(githubLink.text, 'GitHub');
        });

        test('should render bottom-right controls', () => {
            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = AppShell({ app: mockApp }, mockContext) as any;

            const controls = vdom.div.children[3].div;
            assert.equal(controls.className, 'bottom-right-controls');
            assert.equal(controls.style.position, 'fixed');
            assert.equal(controls.style.right, '1.5rem');
            assert.equal(controls.style.bottom, '1.5rem');
            assert.equal(controls.style.zIndex, '1000');

            assert.ok(Array.isArray(controls.children));
            assert.equal(controls.children.length, 2);
            assert.ok(controls.children[0].Icon);
            assert.ok(controls.children[1].ThemeSwitch);
        });

        test('should render env info modal', () => {
            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = AppShell({ app: mockApp }, mockContext) as any;

            const modal = vdom.div.children[4].EnvInfoModal;
            assert.ok(modal);
            assert.equal(modal.stateKey, 'ui.showEnvInfoModal');
        });
    });

    describe('Interactions', () => {
        test('should open env info modal on icon click', () => {
            let stateKey = '';
            let stateValue: unknown;

            const contextWithSetState = {
                ...mockContext,
                setState: (key: string, value: unknown) => {
                    stateKey = key;
                    stateValue = value;
                },
            } as JurisContext;

            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = AppShell({ app: mockApp }, contextWithSetState) as any;

            const infoIcon = vdom.div.children[3].div.children[0].Icon;
            assert.ok(infoIcon.onClick);

            infoIcon.onClick();

            assert.equal(stateKey, 'ui.showEnvInfoModal');
            assert.equal(stateValue, true);
        });
    });
});
