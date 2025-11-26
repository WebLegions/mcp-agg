/// <reference lib="dom" />
/**
 * Tests for server-modal component
 * Tests both DOM rendering and schema validation
 */

import { strict as assert } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { before, beforeEach, describe, test } from 'node:test';
import { mcpHTTPServerSchema, mcpSSEServerSchema, mcpStdioServerSchema } from '../../shared/types/mcp-config';
import { formInput } from '../components/form-input';
import { icon } from '../components/icon';
import { modal } from '../components/modal';
import type { j } from '../main';
import { serverModal } from './server-modal';

describe('Server Modal Component (DOM Rendering)', () => {
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

        juris.registerComponent('icon', icon as never);
        juris.registerComponent('modal', modal as never);
        juris.registerComponent('formInput', formInput as never);
        juris.registerComponent('serverModal', serverModal as never);
    });

    // Before each test: Clear the body and reset state
    beforeEach(() => {
        document.body.innerHTML = '';
        const ctx = juris.createContext();
        ctx.setState('ui.showServerModal', false);
        ctx.setState('serverModal.transport.value', 'stdio');
        ctx.setState('serverModal.name.value', '');
    });

    test('should render modal when showServerModal is true', () => {
        juris.createContext().setState('ui.showServerModal', true);

        const vnode: j.Elem = {
            div: {
                children: [{ serverModal: {} }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Verify modal backdrop exists and is visible
        const backdrop = document.querySelector('.backdrop');
        assert.ok(backdrop, 'Modal backdrop should exist');

        // Verify modal dialog article exists
        const dialog = document.querySelector('.dialog');
        assert.ok(dialog, 'Dialog element should exist');
    });

    test('should not render modal when showServerModal is false', () => {
        juris.createContext().setState('ui.showServerModal', false);

        const vnode: j.Elem = {
            div: {
                children: [{ serverModal: {} }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Modal backdrop exists but should be hidden (display: none)
        const backdrop = document.querySelector('.backdrop') as HTMLElement;
        assert.ok(backdrop, 'Backdrop should exist');
        assert.equal(backdrop.style.display, 'none', 'Backdrop should be hidden when showServerModal is false');
    });

    test('should render transport type selector', () => {
        juris.createContext().setState('ui.showServerModal', true);

        const vnode: j.Elem = {
            div: {
                children: [{ serverModal: {} }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Find transport selector
        const select = document.querySelector('select[name="transport"]');
        assert.ok(select, 'Transport selector should exist');

        // Verify options exist
        const options = select?.querySelectorAll('option');
        assert.ok(options && options.length >= 3, 'Should have at least 3 transport options');
    });

    test('should render different fields for stdio transport', () => {
        juris.createContext().setState('ui.showServerModal', true);
        juris.createContext().setState('serverModal.transport.value', 'stdio');

        const vnode: j.Elem = {
            div: {
                children: [{ serverModal: {} }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Stdio transport should have command field
        const allText = document.body.textContent || '';
        assert.ok(allText.includes('Command'), 'Should have Command field for stdio');
    });

    test('should render different fields for SSE transport', () => {
        juris.createContext().setState('ui.showServerModal', true);
        juris.createContext().setState('serverModal.transport.value', 'sse');

        const vnode: j.Elem = {
            div: {
                children: [{ serverModal: {} }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // SSE transport should have URL field
        const allText = document.body.textContent || '';
        assert.ok(allText.includes('URL'), 'Should have URL field for SSE');
    });

    test('should render create and cancel buttons', () => {
        juris.createContext().setState('ui.showServerModal', true);
        juris.createContext().setState('ui.serverModalMode', 'create');

        const vnode: j.Elem = {
            div: {
                children: [{ serverModal: {} }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Find footer with buttons
        const footer = document.querySelector('footer.footer');
        assert.ok(footer, 'Footer should exist');

        const buttons = Array.from(footer.querySelectorAll('button'));
        const createButton = buttons.find((btn) => btn.textContent?.includes('Create'));
        const cancelButton = buttons.find((btn) => btn.textContent?.includes('Cancel'));

        assert.ok(createButton, 'Create button should exist');
        assert.ok(cancelButton, 'Cancel button should exist');
    });

    test('should handle transport onChange and update state', () => {
        const ctx = juris.createContext();
        ctx.setState('ui.showServerModal', true);
        ctx.setState('serverModal.transport.value', 'stdio');

        const vnode: j.Elem = {
            div: {
                children: [{ serverModal: {} }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Find the transport select element
        const transportSelect = document.querySelector('select[name="transport"]') as HTMLSelectElement;
        assert.ok(transportSelect, 'Transport select should exist');

        // Change to SSE
        transportSelect.value = 'sse';
        const changeEvent = new Event('change', { bubbles: true });
        transportSelect.dispatchEvent(changeEvent);

        // Verify state was updated
        const newTransport = ctx.getState('serverModal.transport.value');
        assert.equal(newTransport, 'sse', 'Transport state should be updated to sse');

        // Verify stdio-specific fields were cleared
        const commandValue = ctx.getState('serverModal.command.value', undefined);
        const argsValue = ctx.getState('serverModal.args.value', undefined);
        assert.equal(commandValue, '', 'Command should be cleared when switching to SSE');
        assert.equal(argsValue, '', 'Args should be cleared when switching to SSE');
    });

    test('should handle form onSubmit with invalid form', () => {
        const ctx = juris.createContext();
        ctx.setState('ui.showServerModal', true);
        ctx.setState('ui.serverModalMode', 'create');
        ctx.setState('serverModal.validated', false);

        // Mock the config service create/update methods
        const mockSaveServer = { called: false };
        Object(ctx).config = {
            create: async () => {
                mockSaveServer.called = true;
            },
            update: async () => {
                mockSaveServer.called = true;
            },
        };

        const vnode: j.Elem = {
            div: {
                children: [{ serverModal: {} }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Find the form
        const form = document.querySelector('form');
        assert.ok(form, 'Form should exist');

        // Submit the form without filling required fields
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);

        // Verify saveServer was NOT called because form is invalid
        assert.equal(mockSaveServer.called, false, 'saveServer should not be called when form is invalid');
    });

    test('should handle form onSubmit and prevent default', () => {
        const ctx = juris.createContext();
        ctx.setState('ui.showServerModal', true);
        ctx.setState('ui.serverModalMode', 'create');

        // Mock the config service create/update methods
        Object(ctx).config = {
            create: async () => {},
            update: async () => {},
        };

        const vnode: j.Elem = {
            div: {
                children: [{ serverModal: {} }],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Find the form
        const form = document.querySelector('form');
        assert.ok(form, 'Form should exist');

        // Create a submit event
        let defaultPrevented = false;
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });

        // Override preventDefault to track if it was called
        const originalPreventDefault = submitEvent.preventDefault;
        submitEvent.preventDefault = function () {
            defaultPrevented = true;
            originalPreventDefault.call(this);
        };

        // Submit the form
        form.dispatchEvent(submitEvent);

        // Verify preventDefault was called (handleSubmit always calls preventDefault)
        assert.equal(defaultPrevented, true, 'Form submit should call preventDefault');
    });
});

describe('Server Modal Schema Validation', () => {
    /**
     * Helper function to validate a field using the appropriate schema
     */
    function validateField(field: string, value: unknown, transport: string): string | undefined {
        let schema: typeof mcpStdioServerSchema | typeof mcpSSEServerSchema | typeof mcpHTTPServerSchema;
        switch (transport) {
            case 'stdio':
                schema = mcpStdioServerSchema;
                break;
            case 'sse':
                schema = mcpSSEServerSchema;
                break;
            case 'http':
                schema = mcpHTTPServerSchema;
                break;
            default:
                return 'command: invalid field';
        }

        // Extract field validator from schema
        // @ts-expect-error - accessing internal _schema field
        const fieldValidator = schema._schema?.[field];
        if (!fieldValidator) {
            return `${field}: invalid field`;
        }

        const result = fieldValidator.safeParse(value);
        return result.success ? undefined : `${field}: ${result.error?.message || 'validation error'}`;
    }

    test('validates stdio transport fields', () => {
        // Valid command
        assert.equal(validateField('command', 'node server.js', 'stdio'), undefined);

        // Empty command returns error
        const cmdError = validateField('command', '', 'stdio');
        assert.ok(cmdError !== undefined && cmdError.length > 0, 'Empty command should error');

        // Valid args array
        assert.equal(validateField('args', ['--port', '3000'], 'stdio'), undefined);

        // Optional args can be undefined
        assert.equal(validateField('args', undefined, 'stdio'), undefined);

        // URL field doesn't exist on stdio
        assert.equal(validateField('url', 'https://example.com', 'stdio'), 'url: invalid field');
    });

    test('validates SSE/HTTP transport fields', () => {
        // Valid SSE URL
        assert.equal(validateField('url', 'https://example.com/sse', 'sse'), undefined);

        // Invalid URL returns error
        const urlError = validateField('url', 'not-a-url', 'sse');
        assert.ok(urlError !== undefined && urlError.length > 0, 'Invalid URL should error');

        // Valid HTTP URL
        assert.equal(validateField('url', 'https://api.example.com', 'http'), undefined);

        // Command field doesn't exist on SSE
        assert.equal(validateField('command', 'node server.js', 'sse'), 'command: invalid field');
    });

    test('validates common fields across all transports', () => {
        // Valid name
        assert.equal(validateField('name', 'my-server', 'stdio'), undefined);

        // Empty name returns error
        const nameError = validateField('name', '', 'stdio');
        assert.ok(nameError !== undefined && nameError.length > 0, 'Empty name should error');

        // Name too long returns error
        const longNameError = validateField('name', 'a'.repeat(121), 'stdio');
        assert.ok(longNameError !== undefined && longNameError.length > 0, 'Long name should error');

        // Valid description
        assert.equal(validateField('description', 'A test server', 'stdio'), undefined);

        // Optional description can be undefined
        assert.equal(validateField('description', undefined, 'stdio'), undefined);

        // Valid enabled boolean
        assert.equal(validateField('enabled', true, 'stdio'), undefined);

        // Optional enabled can be undefined
        assert.equal(validateField('enabled', undefined, 'stdio'), undefined);

        // Valid env record
        assert.equal(validateField('env', { NODE_ENV: 'production' }, 'stdio'), undefined);

        // Optional env can be undefined
        assert.equal(validateField('env', undefined, 'stdio'), undefined);
    });

    test('validates field and transport errors', () => {
        // Non-existent field
        assert.equal(validateField('nonexistent', 'value', 'stdio'), 'nonexistent: invalid field');

        // Invalid transport
        assert.equal(validateField('command', 'value', 'invalid-transport'), 'command: invalid field');
    });
});
