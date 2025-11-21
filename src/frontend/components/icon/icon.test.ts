/// <reference lib="dom" />
import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import type { JurisContext } from '../../types/juris';
import { Icon } from './index';

describe('Icon Component', () => {
    let mockContext: JurisContext;

    beforeEach(() => {
        document.body.innerHTML = '';
        mockContext = {
            getState: <T>(_key: string, defaultValue?: T): T => defaultValue as T,
            setState: (_key: string, _value: unknown) => {},
            headlessAPIs: {},
            executeBatch: (callback: () => unknown) => callback(),
        } as JurisContext;
    });

    const mockSvg = {
        svg: {
            viewBox: '0 0 24 24',
            children: [],
        },
    };

    describe('Rendering', () => {
        test('should render div with svg child', () => {
            const vdom = Icon(
                {
                    svg: mockSvg,
                    ariaLabel: 'Test Icon',
                },
                mockContext,
                // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            ) as any;

            assert.ok(vdom.div);
            assert.equal(vdom.div['aria-label'], 'Test Icon');
            assert.equal(vdom.div.title, 'Test Icon');
            assert.equal(vdom.div.children.length, 1);
            assert.deepEqual(vdom.div.children[0], mockSvg);
        });

        test('should use title prop if provided', () => {
            const vdom = Icon(
                {
                    svg: mockSvg,
                    ariaLabel: 'Test Icon',
                    title: 'Custom Title',
                },
                mockContext,
                // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            ) as any;

            assert.equal(vdom.div.title, 'Custom Title');
        });

        test('should set button role when interactive', () => {
            const vdom = Icon(
                {
                    svg: mockSvg,
                    ariaLabel: 'Test Icon',
                    onClick: () => {},
                },
                mockContext,
                // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            ) as any;

            assert.equal(vdom.div.role, 'button');
            assert.equal(vdom.div.tabindex, '0');
            assert.equal(vdom.div.style.cursor, 'pointer');
        });

        test('should not have button role when not interactive', () => {
            const vdom = Icon(
                {
                    svg: mockSvg,
                    ariaLabel: 'Test Icon',
                },
                mockContext,
                // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            ) as any;

            assert.equal(vdom.div.role, undefined);
            assert.equal(vdom.div.tabindex, undefined);
            assert.equal(vdom.div.style.cursor, 'default');
        });
    });

    describe('Interactions', () => {
        test('should handle click events', () => {
            let clicked = false;
            const vdom = Icon(
                {
                    svg: mockSvg,
                    ariaLabel: 'Test Icon',
                    onClick: () => {
                        clicked = true;
                    },
                },
                mockContext,
                // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            ) as any;

            vdom.div.onClick();
            assert.ok(clicked);
        });

        test('should handle hover events', () => {
            let hovered = false;
            const vdom = Icon(
                {
                    svg: mockSvg,
                    ariaLabel: 'Test Icon',
                    onHover: () => {
                        hovered = true;
                    },
                },
                mockContext,
                // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            ) as any;

            vdom.div.onMouseEnter();
            assert.ok(hovered);
        });

        test('should handle keyboard Enter key', () => {
            let clicked = false;
            const vdom = Icon(
                {
                    svg: mockSvg,
                    ariaLabel: 'Test Icon',
                    onClick: () => {
                        clicked = true;
                    },
                },
                mockContext,
                // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            ) as any;

            const event = new KeyboardEvent('keydown', { key: 'Enter' });
            // Mock preventDefault
            Object.defineProperty(event, 'preventDefault', { value: () => {} });

            vdom.div.onkeydown(event);
            assert.ok(clicked);
        });

        test('should handle keyboard Space key', () => {
            let clicked = false;
            const vdom = Icon(
                {
                    svg: mockSvg,
                    ariaLabel: 'Test Icon',
                    onClick: () => {
                        clicked = true;
                    },
                },
                mockContext,
                // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            ) as any;

            const event = new KeyboardEvent('keydown', { key: ' ' });
            // Mock preventDefault
            Object.defineProperty(event, 'preventDefault', { value: () => {} });

            vdom.div.onkeydown(event);
            assert.ok(clicked);
        });

        test('should ignore other keys', () => {
            let clicked = false;
            const vdom = Icon(
                {
                    svg: mockSvg,
                    ariaLabel: 'Test Icon',
                    onClick: () => {
                        clicked = true;
                    },
                },
                mockContext,
                // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            ) as any;

            const event = new KeyboardEvent('keydown', { key: 'A' });
            vdom.div.onkeydown(event);
            assert.equal(clicked, false);
        });
    });
});
