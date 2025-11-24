/// <reference lib="dom" />
import { strict as assert } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { before, beforeEach, describe, test } from 'node:test';
import type { JurisInstance, JurisVDOMElement } from '../../types/juris';
import { modal } from './index';

describe('Modal Component (DOM Rendering)', () => {
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
        juris.registerComponent('modal', modal as never);
    });

    // Before each test: Clear the body and state
    beforeEach(() => {
        document.body.innerHTML = '';
        juris.createContext().setState('ui.modal', '');
    });

    test('should render modal structure with header, body, footer when shown', () => {
        juris.createContext().setState('ui.modal', 'show');

        const vnode: JurisVDOMElement = {
            div: {
                children: [
                    {
                        modal: {
                            id: 'test-modal',
                            stateKey: 'ui.modal',
                            title: 'Test Modal',
                            message: 'Hello World',
                        },
                    },
                ],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Verify backdrop
        const backdrop = document.querySelector('.backdrop');
        assert.ok(backdrop, 'Backdrop should exist');
        const backdropEl = backdrop as HTMLElement;
        assert.equal(backdropEl.style.position, 'fixed');
        assert.equal(backdropEl.style.zIndex, '1000');

        // Verify dialog
        const dialog = document.querySelector('.dialog');
        assert.ok(dialog, 'Dialog should exist');

        // Verify header with title
        const header = dialog?.querySelector('header');
        assert.ok(header, 'Header should exist');
        const h3 = header?.querySelector('h3');
        assert.equal(h3?.textContent, 'Test Modal');

        // Verify body with message
        const body = dialog?.querySelector('.body');
        assert.ok(body, 'Body should exist');
        const paragraph = body?.querySelector('p');
        assert.equal(paragraph?.textContent, 'Hello World');

        // Verify footer with OK button
        const footer = dialog?.querySelector('.footer');
        assert.ok(footer, 'Footer should exist');
        const button = footer?.querySelector('button');
        assert.equal(button?.textContent, 'OK');
    });

    test('should be hidden when state is empty', () => {
        juris.createContext().setState('ui.modal', '');

        const vnode: JurisVDOMElement = {
            div: {
                children: [
                    {
                        modal: {
                            id: 'test-modal',
                            stateKey: 'ui.modal',
                            title: 'Test Modal',
                        },
                    },
                ],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        const backdrop = document.querySelector('.backdrop') as HTMLElement;
        assert.ok(backdrop, 'Backdrop should exist');
        assert.equal(backdrop.style.display, 'none', 'Modal should be hidden');
    });

    test('should close modal when backdrop is clicked', () => {
        juris.createContext().setState('ui.modal', 'show');

        const vnode: JurisVDOMElement = {
            div: {
                children: [
                    {
                        modal: {
                            id: 'test-modal',
                            stateKey: 'ui.modal',
                            title: 'Test Modal',
                        },
                    },
                ],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Click backdrop
        const backdrop = document.querySelector('.backdrop') as HTMLElement;
        assert.ok(backdrop, 'Backdrop should exist');
        backdrop.click();

        // Verify modal is closed
        assert.equal(juris.createContext().getState('ui.modal'), '');
    });
});
