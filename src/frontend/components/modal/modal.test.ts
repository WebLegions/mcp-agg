/// <reference lib="dom" />
import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import type { JurisContext } from '../../types/juris';
import { Modal } from './index';

describe('Modal Component', () => {
    let mockContext: JurisContext;
    let state: Record<string, unknown>;

    beforeEach(() => {
        document.body.innerHTML = '';
        state = {};
        mockContext = {
            getState: <T>(key: string, defaultValue?: T): T => {
                return (key in state ? state[key] : defaultValue) as T;
            },
            setState: (key: string, value: unknown) => {
                state[key] = value;
            },
            headlessAPIs: {},
            executeBatch: (callback: () => unknown) => callback(),
        } as JurisContext;
    });

    describe('Rendering', () => {
        test('should render backdrop with correct styles', () => {
            state['ui.modal'] = 'show';
            // biome-ignore lint/suspicious/noExplicitAny: VDOM access
            const vdom = Modal(
                {
                    id: 'test-modal',
                    stateKey: 'ui.modal',
                    title: 'Test Modal',
                },
                mockContext,
                // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            ) as any;

            assert.ok(vdom.div);
            assert.equal(vdom.div.className, 'backdrop');
            assert.equal(vdom.div.style.position, 'fixed');
            assert.equal(vdom.div.style.zIndex, 1000);
            // Check display function
            assert.equal(vdom.div.style.display(), 'flex');
        });

        test('should be hidden when state is empty', () => {
            state['ui.modal'] = '';
            // biome-ignore lint/suspicious/noExplicitAny: VDOM access
            const vdom = Modal(
                {
                    id: 'test-modal',
                    stateKey: 'ui.modal',
                    title: 'Test Modal',
                },
                mockContext,
                // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            ) as any;

            assert.equal(vdom.div.style.display(), 'none');
        });

        test('should render dialog container', () => {
            // biome-ignore lint/suspicious/noExplicitAny: VDOM access
            const vdom = Modal(
                {
                    id: 'test-modal',
                    stateKey: 'ui.modal',
                    title: 'Test Modal',
                },
                mockContext,
                // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            ) as any;

            const dialog = vdom.div.children[0].article;
            assert.ok(dialog);
            assert.equal(dialog.className, 'dialog');
        });

        test('should render title in header', () => {
            // biome-ignore lint/suspicious/noExplicitAny: VDOM access
            const vdom = Modal(
                {
                    id: 'test-modal',
                    stateKey: 'ui.modal',
                    title: 'Custom Title',
                },
                mockContext,
                // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            ) as any;

            const header = vdom.div.children[0].article.children[0].header;
            const title = header.children[0].h3;
            assert.equal(title.text, 'Custom Title');
        });

        test('should render close icon in header', () => {
            // biome-ignore lint/suspicious/noExplicitAny: VDOM access
            const vdom = Modal(
                {
                    id: 'test-modal',
                    stateKey: 'ui.modal',
                    title: 'Test Modal',
                },
                mockContext,
                // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            ) as any;

            const header = vdom.div.children[0].article.children[0].header;
            const closeIcon = header.children[1].Icon;
            assert.ok(closeIcon);
            assert.equal(closeIcon.ariaLabel, 'Close modal');
        });

        test('should render message content', () => {
            // biome-ignore lint/suspicious/noExplicitAny: VDOM access
            const vdom = Modal(
                {
                    id: 'test-modal',
                    stateKey: 'ui.modal',
                    message: 'Hello World',
                },
                mockContext,
                // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            ) as any;

            const body = vdom.div.children[0].article.children[1].div;
            assert.equal(body.className, 'body');
            assert.equal(body.children[0].p.text, 'Hello World');
        });

        test('should render custom children content', () => {
            // biome-ignore lint/suspicious/noExplicitAny: VDOM access
            const vdom = Modal(
                {
                    id: 'test-modal',
                    stateKey: 'ui.modal',
                    children: [{ div: { id: 'custom-content' } }],
                },
                mockContext,
                // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            ) as any;

            const body = vdom.div.children[0].article.children[1].div;
            assert.equal(body.children[0].div.id, 'custom-content');
        });

        test('should render default OK button', () => {
            // biome-ignore lint/suspicious/noExplicitAny: VDOM access
            const vdom = Modal(
                {
                    id: 'test-modal',
                    stateKey: 'ui.modal',
                },
                mockContext,
                // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            ) as any;

            const footer = vdom.div.children[0].article.children[2].footer;
            assert.equal(footer.className, 'footer');
            assert.equal(footer.children.length, 1);
            assert.equal(footer.children[0].button.text, 'OK');
        });

        test('should render custom footer buttons', () => {
            // biome-ignore lint/suspicious/noExplicitAny: VDOM access
            const vdom = Modal(
                {
                    id: 'test-modal',
                    stateKey: 'ui.modal',
                    footerButtons: [{ button: { text: 'Custom' } }],
                },
                mockContext,
                // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            ) as any;

            const footer = vdom.div.children[0].article.children[2].footer;
            assert.equal(footer.children[0].button.text, 'Custom');
        });
    });

    describe('Interactions', () => {
        test('should close on backdrop click', () => {
            state['ui.modal'] = 'show';
            // biome-ignore lint/suspicious/noExplicitAny: VDOM access
            const vdom = Modal(
                {
                    id: 'test-modal',
                    stateKey: 'ui.modal',
                },
                mockContext,
                // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            ) as any;

            // Simulate click on backdrop (target === currentTarget)
            const event = { target: 'backdrop', currentTarget: 'backdrop' };
            vdom.div.onClick(event);

            assert.equal(state['ui.modal'], '');
        });

        test('should NOT close on dialog click', () => {
            state['ui.modal'] = 'show';
            // biome-ignore lint/suspicious/noExplicitAny: VDOM access
            const vdom = Modal(
                {
                    id: 'test-modal',
                    stateKey: 'ui.modal',
                },
                mockContext,
                // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            ) as any;

            const dialog = vdom.div.children[0].article;

            let propagationStopped = false;
            const event = {
                stopPropagation: () => {
                    propagationStopped = true;
                },
            };

            dialog.onClick(event);

            assert.equal(state['ui.modal'], 'show');
            assert.ok(propagationStopped);
        });

        test('should close on close icon click', () => {
            state['ui.modal'] = 'show';
            // biome-ignore lint/suspicious/noExplicitAny: VDOM access
            const vdom = Modal(
                {
                    id: 'test-modal',
                    stateKey: 'ui.modal',
                },
                mockContext,
                // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            ) as any;

            const header = vdom.div.children[0].article.children[0].header;
            const closeIcon = header.children[1].Icon;

            closeIcon.onClick();

            assert.equal(state['ui.modal'], '');
        });

        test('should close on default OK button click', () => {
            state['ui.modal'] = 'show';
            // biome-ignore lint/suspicious/noExplicitAny: VDOM access
            const vdom = Modal(
                {
                    id: 'test-modal',
                    stateKey: 'ui.modal',
                },
                mockContext,
                // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            ) as any;

            const footer = vdom.div.children[0].article.children[2].footer;
            const okButton = footer.children[0].button;

            okButton.onClick();

            assert.equal(state['ui.modal'], '');
        });
    });
});
