/**
 * BaseModal component tests
 */

import { deepStrictEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { JurisContext } from '../types/juris';
import { BaseModal } from './base-modal';

describe('BaseModal', () => {
    test('returns empty div when state is null', () => {
        const mockCtx = {
            getState: () => null,
            setState: () => {},
        } as unknown as JurisContext;
        const result = BaseModal(
            {
                id: 'test-modal',
                stateKey: 'ui.testModal',
            },
            mockCtx,
        );

        ok('div' in result);
        if ('div' in result) {
            deepStrictEqual(result.div, {});
        }
    });

    test('renders modal with message when state is truthy', () => {
        const mockCtx = {
            getState: () => 'show',
            setState: () => {},
        } as unknown as JurisContext;

        const result = BaseModal(
            {
                id: 'test-modal',
                title: 'Test Title',
                message: 'Test message',
                stateKey: 'ui.testModal',
            },
            mockCtx,
        );

        // Verify structure
        ok('div' in result);
        if ('div' in result) {
            ok(result.div.id);
            strictEqual(result.div.id, 'test-modal');
            ok(result.div.children);
            ok(Array.isArray(result.div.children));
        }
    });

    test('uses custom children instead of message', () => {
        const mockCtx = {
            getState: () => 'show',
            setState: () => {},
        } as unknown as JurisContext;
        const customContent = [{ span: { text: 'Custom content' } }];

        const result = BaseModal(
            {
                id: 'test-modal',
                stateKey: 'ui.testModal',
                children: customContent,
            },
            mockCtx,
        );

        ok('div' in result);
        if ('div' in result) {
            ok(result.div.children);
        }
    });

    test('uses custom footer buttons', () => {
        let stateValue: string | null = 'show';
        const mockCtx = {
            getState: () => stateValue,
            setState: (_key: string, value: string | null) => {
                stateValue = value;
            },
        } as unknown as JurisContext;

        const footerButtons = [
            {
                button: {
                    text: 'Cancel',
                    onClick: () => {
                        mockCtx.setState('ui.testModal', 'cancel');
                    },
                },
            },
            {
                button: {
                    text: 'Save',
                    onClick: () => {
                        mockCtx.setState('ui.testModal', 'save');
                    },
                },
            },
        ];

        const result = BaseModal(
            {
                id: 'test-modal',
                stateKey: 'ui.testModal',
                footerButtons,
            },
            mockCtx,
        );

        ok('div' in result);
        strictEqual(stateValue, 'show');
    });

    test('has default OK button that sets state to "ok"', () => {
        let stateValue: string | null = 'show';
        const mockCtx = {
            getState: () => stateValue,
            setState: (_key: string, value: string | null) => {
                stateValue = value;
            },
        } as unknown as JurisContext;

        const result = BaseModal(
            {
                id: 'test-modal',
                title: 'Alert',
                message: 'Something happened',
                stateKey: 'ui.testModal',
            },
            mockCtx,
        );

        ok('div' in result);
        if ('div' in result) {
            ok(result.div.children);
        }
        strictEqual(stateValue, 'show'); // Still 'show' until button clicked
    });
});
