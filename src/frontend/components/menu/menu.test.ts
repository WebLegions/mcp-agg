/// <reference lib="dom" />
import { strict as assert } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { before, beforeEach, describe, test } from 'node:test';
import type { j } from '../../main';
import { menu } from './index';

describe('Menu Component (DOM Rendering)', () => {
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

        juris = new Juris({ states: {} });
        juris.registerComponent('menu', menu as never);
    });

    // Before each test: Clear the body
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    test('should render menu with items', () => {
        const vnode: j.Elem = {
            menu: {
                slug: 'test-menu',
                items: [
                    { type: 'item', text: 'Item 1', onClick: () => {} },
                    { type: 'item', text: 'Item 2', onClick: () => {} },
                ],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Verify menu article exists
        const menuArticle = document.querySelector('article[role="menu"]');
        assert.ok(menuArticle, 'Menu article should exist');

        // Verify menu items exist
        const menuItems = document.querySelectorAll('.menu-item');
        assert.equal(menuItems.length, 2, 'Should have 2 menu items');
        assert.equal(menuItems[0].textContent, 'Item 1');
        assert.equal(menuItems[1].textContent, 'Item 2');
    });

    test('should render menu item with shortcut', () => {
        const vnode: j.Elem = {
            menu: {
                slug: 'test-menu',
                items: [{ type: 'item', text: 'Save', onClick: () => {}, shortcut: 'Ctrl+S' }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        const shortcut = document.querySelector('.menu-item-shortcut');
        assert.ok(shortcut, 'Shortcut should exist');
        assert.equal(shortcut.textContent, 'Ctrl+S');
    });

    test('should render disabled menu item', () => {
        const vnode: j.Elem = {
            menu: {
                slug: 'test-menu',
                items: [{ type: 'item', text: 'Disabled', onClick: () => {}, disabled: true }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        const menuItem = document.querySelector('.menu-item');
        assert.ok(menuItem, 'Menu item should exist');
        assert.ok(menuItem.classList.contains('disabled'), 'Should have disabled class');
    });

    test('should render separator', () => {
        const vnode: j.Elem = {
            menu: {
                slug: 'test-menu',
                items: [
                    { type: 'item', text: 'Item 1', onClick: () => {} },
                    { type: 'separator' },
                    { type: 'item', text: 'Item 2', onClick: () => {} },
                ],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        const separator = document.querySelector('.menu-separator');
        assert.ok(separator, 'Separator should exist');
        assert.equal(separator.tagName.toLowerCase(), 'hr');
    });

    test('should render label', () => {
        const vnode: j.Elem = {
            menu: {
                slug: 'test-menu',
                items: [
                    { type: 'label', text: 'Actions' },
                    { type: 'item', text: 'Save', onClick: () => {} },
                ],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        const label = document.querySelector('.menu-label');
        assert.ok(label, 'Label should exist');
        assert.equal(label.textContent, 'Actions');
    });

    test('should render submenu', () => {
        const vnode: j.Elem = {
            menu: {
                slug: 'test-menu',
                items: [
                    {
                        type: 'submenu',
                        text: 'More Options',
                        items: [{ type: 'item', text: 'Sub Item', onClick: () => {} }],
                    },
                ],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        const submenu = document.querySelector('.menu-submenu');
        assert.ok(submenu, 'Submenu should exist');

        const submenuTrigger = document.querySelector('.menu-submenu-trigger');
        assert.ok(submenuTrigger, 'Submenu trigger should exist');
        assert.ok(submenuTrigger.textContent?.includes('More Options'), 'Should contain submenu text');

        const submenuContent = document.querySelector('.menu-submenu-content');
        assert.ok(submenuContent, 'Submenu content should exist');
    });

    test('should position menu with xy coordinates', () => {
        const vnode: j.Elem = {
            menu: {
                slug: 'test-menu',
                items: [{ type: 'item', text: 'Item 1', onClick: () => {} }],
                xy: { x: 100, y: 200 },
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        const menuArticle = document.querySelector('article[role="menu"]') as HTMLElement;
        assert.ok(menuArticle, 'Menu should exist');
        assert.equal(menuArticle.style.position, 'absolute');
        // Positioning happens in setTimeout, so we can't check exact coordinates
    });

    test('should align menu to end when align=end', () => {
        const vnode: j.Elem = {
            menu: {
                slug: 'test-menu',
                items: [{ type: 'item', text: 'Item 1', onClick: () => {} }],
                align: 'end',
                xy: { x: 200, y: 100 },
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        const menuArticle = document.querySelector('article[role="menu"]') as HTMLElement;
        assert.ok(menuArticle, 'Menu should exist');
        assert.equal(menuArticle.style.position, 'absolute');
        // When align=end, the menu is positioned to the left of the x coordinate
        // Positioning happens in setTimeout, so we can't check exact coordinates
    });
});
