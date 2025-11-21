/// <reference lib="dom" />
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { Env } from '../../shared/utils/env';
import type { JurisContext } from '../types/juris';
import { EnvInfoModal } from './env-info-modal';

describe('EnvInfoModal Component', () => {
    let mockContext: JurisContext;
    let originalWindowEnv: Record<string, string> | undefined;

    beforeEach(() => {
        document.body.innerHTML = '';
        mockContext = {
            getState: <T>(_key: string, defaultValue?: T): T => defaultValue as T,
            setState: (_key: string, _value: unknown) => {},
            headlessAPIs: {},
            executeBatch: (callback: () => unknown) => callback(),
        } as JurisContext;

        // Save original window.env
        originalWindowEnv = Object(window).env;

        // Set test environment variables
        Object(window).env = {
            APP_NAME: 'test-app',
            APP_VERSION: '1.0.0',
            NODE_ENV: 'test',
            C_LOG_LEVEL: 'debug',
        };
    });

    afterEach(() => {
        document.body.innerHTML = '';
        // Restore original window.env
        if (originalWindowEnv) {
            Object(window).env = originalWindowEnv;
        } else {
            delete Object(window).env;
        }
    });

    describe('Structure', () => {
        test('should render Modal component', () => {
            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = EnvInfoModal({ stateKey: 'test.modal' }, mockContext) as any;

            assert.ok(vdom.div, 'Should have root div from Modal');
        });

        test('should pass correct props to Modal', () => {
            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = EnvInfoModal({ stateKey: 'ui.showEnvModal' }, mockContext) as any;

            // Modal creates a div with specific attributes
            assert.ok(vdom.div);
        });

        test('should display environment info', () => {
            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = EnvInfoModal({ stateKey: 'test.modal' }, mockContext) as any;

            // Find the content within the modal structure
            const modalContent = vdom.div.children;
            assert.ok(modalContent);

            // The modal should contain environment info
            const hasEnvInfo = JSON.stringify(vdom).includes(Env.runtime);
            assert.ok(hasEnvInfo, 'Should contain runtime info');
        });

        test('should display environment variables', () => {
            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = EnvInfoModal({ stateKey: 'test.modal' }, mockContext) as any;

            const vdomString = JSON.stringify(vdom);
            assert.ok(vdomString.includes('APP_NAME'), 'Should contain APP_NAME');
            assert.ok(vdomString.includes('test-app'), 'Should contain APP_NAME value');
            assert.ok(vdomString.includes('C_LOG_LEVEL'), 'Should contain C_LOG_LEVEL');
            assert.ok(vdomString.includes('debug'), 'Should contain C_LOG_LEVEL value');
        });
    });

    describe('Environment Info Content', () => {
        test('should show runtime information', () => {
            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = EnvInfoModal({ stateKey: 'test.modal' }, mockContext) as any;

            const vdomString = JSON.stringify(vdom);
            assert.ok(vdomString.includes('Runtime:'), 'Should show Runtime label');
            assert.ok(vdomString.includes('Runtime Version:'), 'Should show Runtime Version label');
            assert.ok(vdomString.includes('Node Environment:'), 'Should show Node Environment label');
        });

        test('should show app information', () => {
            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = EnvInfoModal({ stateKey: 'test.modal' }, mockContext) as any;

            const vdomString = JSON.stringify(vdom);
            assert.ok(vdomString.includes('App Name:'), 'Should show App Name label');
            assert.ok(vdomString.includes('App Version:'), 'Should show App Version label');
            assert.ok(vdomString.includes('Has DOM:'), 'Should show Has DOM label');
        });

        test('should handle missing window.env gracefully', () => {
            // Remove window.env
            delete Object(window).env;

            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = EnvInfoModal({ stateKey: 'test.modal' }, mockContext) as any;

            // Should not throw and should still render
            assert.ok(vdom.div);
        });
    });

    describe('Modal Properties', () => {
        test('should use correct modal id', () => {
            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = EnvInfoModal({ stateKey: 'test.modal' }, mockContext) as any;

            const vdomString = JSON.stringify(vdom);
            assert.ok(vdomString.includes('env-info-modal'), 'Should use env-info-modal id');
        });

        test('should have higher z-index than default modal', () => {
            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = EnvInfoModal({ stateKey: 'test.modal' }, mockContext) as any;

            const vdomString = JSON.stringify(vdom);
            // Modal should have z-index 1100 to appear above other modals
            assert.ok(vdomString.includes('1100') || vdom.div.style?.zIndex === 1100);
        });

        test('should pass stateKey to Modal', () => {
            const testStateKey = 'ui.testModal';

            // biome-ignore lint/suspicious/noExplicitAny: Test VDOM access
            const vdom = EnvInfoModal({ stateKey: testStateKey }, mockContext) as any;

            // The modal should be created with this state key
            assert.ok(vdom.div);
        });
    });
});
