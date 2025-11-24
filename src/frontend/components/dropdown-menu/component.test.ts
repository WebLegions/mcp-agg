/// <reference lib="dom" />
import { strict as assert } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { before, beforeEach, describe, test } from 'node:test';
import type { JurisInstance, JurisVDOMElement } from '../../types/juris';
import { menu } from './index';

describe('DropdownMenu Component (DOM Rendering)', () => {
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
        juris.registerComponent('menu', menu as never);
    });

    // Before each test: Clear the body and state
    beforeEach(() => {
        document.body.innerHTML = '';
        juris.createContext().setState('servers.menuId', '');
    });

    test('should render closed menu with trigger button and no content', () => {
        const vnode: JurisVDOMElement = {
            div: {
                children: [
                    {
                        menu: {
                            id: 'test-menu',
                            trigger: { button: { text: 'Open Menu' } },
                            items: [{ type: 'item', text: 'Item 1', onClick: () => {} }],
                        },
                    },
                ],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Verify container exists with proper styling
        const container = document.querySelector('div > div');
        assert.ok(container, 'Container should exist');
        const containerEl = container as HTMLElement;
        assert.equal(containerEl.style.position, 'relative');
        assert.equal(containerEl.style.display, 'inline-block');

        // Verify trigger exists
        const button = document.querySelector('button');
        assert.ok(button, 'Trigger button should exist');
        assert.equal(button.textContent, 'Open Menu');

        // Verify menu content is not shown when closed
        const menuContent = document.querySelector('article[role="menu"]');
        assert.ok(!menuContent, 'Menu content should not be shown when closed');
    });

    test('should render open menu with menu items when state is set', () => {
        juris.createContext().setState('servers.menuId', 'test-menu');

        const vnode: JurisVDOMElement = {
            div: {
                children: [
                    {
                        menu: {
                            id: 'test-menu',
                            trigger: { button: { text: 'Open Menu' } },
                            items: [
                                { type: 'item', text: 'Item 1', onClick: () => {} },
                                { type: 'item', text: 'Item 2', onClick: () => {} },
                            ],
                        },
                    },
                ],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Verify menu content is shown
        const menuContent = document.querySelector('article[role="menu"]');
        assert.ok(menuContent, 'Menu content should be shown when open');
        const menuEl = menuContent as HTMLElement;
        assert.equal(menuEl.style.position, 'absolute');

        // Verify menu items
        const menuItems = document.querySelectorAll('article[role="menu"] > div');
        assert.equal(menuItems.length, 2, 'Should have 2 menu items');
    });

    test('should toggle menu when trigger is clicked', () => {
        const vnode: JurisVDOMElement = {
            div: {
                children: [
                    {
                        menu: {
                            id: 'test-menu',
                            trigger: { button: { text: 'Toggle' } },
                            items: [{ type: 'item', text: 'Item 1', onClick: () => {} }],
                        },
                    },
                ],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Verify initially closed
        assert.equal(juris.createContext().getState('servers.menuId'), '');

        // Click trigger to open
        const triggerContainer = document.querySelector('div > div > div');
        assert.ok(triggerContainer, 'Trigger container should exist');
        (triggerContainer as HTMLElement).click();

        // Verify menu is now open
        assert.equal(juris.createContext().getState('servers.menuId'), 'test-menu');

        // Re-render with new state
        document.body.innerHTML = '';
        const element2 = juris.objectToHtml(vnode);
        document.body.appendChild(element2 as Node);

        // Click trigger again to close
        const triggerContainer2 = document.querySelector('div > div > div');
        (triggerContainer2 as HTMLElement).click();

        // Verify menu is now closed
        assert.equal(juris.createContext().getState('servers.menuId'), '');
    });
});
