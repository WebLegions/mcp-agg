/**
 * Server Modal View
 * Form for creating/editing MCP servers using semantic HTML and FormInput
 * Uses FormInput component for automatic validation from schemas
 * Extends Modal for consistent modal behavior using native <dialog> element
 */

import { mcpHTTPServerSchema, mcpSSEServerSchema, mcpStdioServerSchema } from '../../shared/types/mcp-config';
import { slugify } from '../../shared/utils/text';
import { extractFieldValidators, formInput } from '../components/form-input';
import { modal } from '../components/modal';
import type { j } from '../main';

/**
 * Get schema for specific transport type
 */
function getSchemaForTransport(transport: string) {
    switch (transport) {
        case 'sse':
            return mcpSSEServerSchema;
        case 'http':
            return mcpHTTPServerSchema;
        default:
            return mcpStdioServerSchema;
    }
}

export const serverModal: j.Component = (_props, ctx) => {
    const modalMode = ctx.getState<string>('ui.serverModalMode', 'create');

    // Validate form and update state
    const validateForm = () => {
        const form = document.querySelector('#server-modal form') as HTMLFormElement;
        if (!form) return;
        // Check validity manually to avoid triggering invalid events on all fields
        // checkValidity() fires 'invalid' events which we want to avoid
        const isValid = !form.querySelector(':invalid');
        ctx.setState('serverModal.validated', isValid);
        return isValid;
    };

    // Smart auto-fill handlers
    const handleCommandBlur = (e: Event) => {
        const currentName = ctx.getState('serverModal.name.value', '');
        if (currentName) return;

        const value = (e.target as HTMLInputElement).value.trim();
        if (!value) return;

        const parts = value.split(/\s+/);
        const npxIndex = parts.indexOf('npx');

        if (npxIndex !== -1 && npxIndex < parts.length - 1) {
            // Find first non-flag argument
            const pkg = parts.slice(npxIndex + 1).find((p) => !p.startsWith('-'));
            if (pkg) {
                // If scoped package, take the name part (e.g. @scope/pkg -> pkg)
                const name = pkg.split('/').pop() || pkg;
                ctx.setState('serverModal.name.value', name);
            }
        }
    };

    const handleUrlBlur = (e: Event) => {
        const currentName = ctx.getState('serverModal.name.value', '');
        if (currentName) return;

        const value = (e.target as HTMLInputElement).value.trim();
        if (!value) return;

        try {
            const url = new URL(value);
            ctx.setState('serverModal.name.value', url.hostname);
        } catch (_err) {
            // Invalid URL, ignore
        }
    };

    // Helper function to build form fields based on current transport
    // This will be called reactively when transport changes
    const buildFormFields = (): j.Elem[] => {
        const currentTransport = ctx.getState<string>('serverModal.transport.value', 'stdio');
        const schema = getSchemaForTransport(currentTransport);
        const validators = extractFieldValidators(schema);

        const fields: j.Elem[] = [];

        // 1. Transport field (dropdown selector) - First field, auto-focused
        fields.push({
            div: {
                className: 'form-field',
                children: [
                    { label: { htmlFor: slugify('serverModal', 'transport'), text: 'Transport Type *' } },
                    {
                        select: {
                            id: slugify('serverModal', 'transport'),
                            name: 'transport',
                            value: (): string => ctx.getState('serverModal.transport.value', 'stdio'),
                            autoFocus: true,
                            onChange: (e: Event) => {
                                const value = (e.target as HTMLSelectElement).value;

                                // Update transport
                                ctx.setState('serverModal.transport.value', value);

                                // Clear fields and errors based on transport type
                                if (value === 'stdio') {
                                    // Switching to stdio: clear URL field
                                    ctx.setState('serverModal.url.value', '');
                                    ctx.setState('serverModal.url.error', '');
                                } else {
                                    // Switching to HTTP/SSE: clear command and args fields
                                    ctx.setState('serverModal.command.value', '');
                                    ctx.setState('serverModal.command.error', '');
                                    ctx.setState('serverModal.args.value', '');
                                    ctx.setState('serverModal.args.error', '');
                                }
                            },
                            small: { id: 'transport-help', className: 'help-text', text: 'Communication protocol' },
                            children: [
                                { option: { value: 'stdio', text: 'STDIO' } },
                                { option: { value: 'http', text: 'HTTP' } },
                                { option: { value: 'sse', text: 'SSE' } },
                            ],
                        },
                    },
                ],
            },
        });
        // Transport-specific fields
        if (currentTransport === 'stdio') {
            fields.push(
                formInput(
                    {
                        form: 'serverModal',
                        name: 'command',
                        validator: validators.command,
                        onBlur: handleCommandBlur,
                    },
                    ctx,
                ),
            );

            fields.push(
                formInput(
                    {
                        form: 'serverModal',
                        name: 'args',
                        validator: validators.args,
                    },
                    ctx,
                ),
            );
        } else {
            fields.push(
                formInput(
                    {
                        form: 'serverModal',
                        name: 'url',
                        validator: validators.url,
                        onBlur: handleUrlBlur,
                        autocomplete: 'url',
                    },
                    ctx,
                ),
            );
        }

        fields.push(
            formInput(
                {
                    form: 'serverModal',
                    name: 'name',
                    validator: validators.name,
                    disabled: modalMode === 'edit',
                    // autoFocus removed as Transport is now first
                },
                ctx,
            ),
        );

        fields.push(
            formInput(
                {
                    form: 'serverModal',
                    name: 'description',
                    validator: validators.description,
                },
                ctx,
            ),
        );

        return fields;
    };

    // Handle form submission
    const handleSubmit = async (e: Event) => {
        e.preventDefault();

        // Get form element
        const form = (e.target as HTMLElement).closest('form') || (e.target as HTMLFormElement);

        // Trigger blur on all inputs to show inline validation errors
        if (!validateForm()) {
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach((input) => {
                const event = new Event('blur', { bubbles: true });
                input.dispatchEvent(event);
            });
            return;
        }

        // Submit form - call create or update based on modal mode
        const mode = ctx.getState<string>('ui.serverModalMode', 'create');
        if (mode === 'create') {
            await ctx.config.create();
        } else {
            await ctx.config.update();
        }
    };

    // Modal content: form with fields
    // Build fields on every render so they update when transport changes
    const modalContent: j.Elem[] = [
        {
            form: {
                // Pass function to children for reactive updates
                children: () => buildFormFields(),
                onSubmit: handleSubmit,
                onInput: validateForm,
            },
        },
    ];

    // Modal footer buttons
    const footerButtons: j.Elem[] = [
        {
            button: {
                type: 'button',
                text: 'Cancel',
                onClick: () => ctx.setState('ui.showServerModal', false),
            },
        },
        {
            button: {
                type: 'submit',
                text: modalMode === 'create' ? 'Create' : 'Update',
                disabled: () => !ctx.getState('serverModal.validated', false),
                // Don't use onClick on submit button - form's onSubmit handles it
            },
        },
    ];

    // Use Modal with reactive state control
    // State 'ui.showServerModal' controls visibility:
    // - null/false: hidden
    // - truthy value (e.g., true, 'show'): shown
    // - 'cancel': user clicked cancel
    // - Any other value: modal was closed
    return modal(
        {
            id: 'server-modal',
            title: () => (ctx.getState('ui.serverModalMode') === 'create' ? 'Add New Server' : 'Edit Server'),
            stateKey: 'ui.showServerModal',
            children: modalContent,
            footerButtons,
        },
        ctx,
    );
};
