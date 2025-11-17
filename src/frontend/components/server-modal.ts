/**
 * Server Modal Component
 * Form for creating/editing MCP servers using semantic HTML and ValidatorInput
 * Uses ValidatorInput component for automatic validation from schemas
 */

import { mcpHTTPServerSchema, mcpSSEServerSchema, mcpStdioServerSchema } from '../../shared/types/mcp-config';
import { slugify } from '../../shared/utils/text';
import type { McpConfigApp } from '../main';
import type { JurisContext, JurisVDOMElement } from '../types/juris';
import { extractFieldValidators, ValidatorInput } from './validator-input';

type ServerModalProps = {
    app: McpConfigApp;
};

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

export function ServerModal(props: ServerModalProps, ctx: JurisContext): JurisVDOMElement {
    const { app } = props;
    const showModal = app.getState<boolean>('ui.showServerModal', false);
    const modalMode = app.getState<string>('ui.serverModalMode', 'create');

    if (!showModal) {
        return { div: {} };
    }

    // Helper function to build form fields based on current transport
    // This will be called reactively when transport changes
    const buildFormFields = (): JurisVDOMElement[] => {
        const currentTransport = app.getState<string>('serverModal.transport', 'stdio');
        const schema = getSchemaForTransport(currentTransport);
        const validators = extractFieldValidators(schema);

        const fields: JurisVDOMElement[] = [];

        // Name field (common to all transports)
        fields.push(
            ValidatorInput({
                ctx,
                formName: 'serverModal',
                fieldName: 'name',
                validator: validators.name,
                disabled: modalMode === 'edit',
                autoFocus: true,
            }),
        );

        // Transport field (dropdown selector)
        fields.push({
            div: {
                className: 'form-field',
                children: [
                    { label: { htmlFor: 'transport', text: 'Transport Type *' } },
                    {
                        select: {
                            id: slugify('serverModal', 'transport'),
                            name: 'transport',
                            value: (): string => app.getState('serverModal.transport', 'stdio'),
                            onChange: (e: Event) => {
                                const value = (e.target as HTMLSelectElement).value;
                                app.setState('serverModal.transport', value);
                            },
                            children: [
                                { option: { value: 'stdio', text: 'STDIO' } },
                                { option: { value: 'http', text: 'HTTP' } },
                                { option: { value: 'sse', text: 'SSE' } },
                            ],
                        },
                    },
                    { small: { id: 'transport-help', className: 'help-text', text: 'Communication protocol' } },
                ],
            },
        });

        // Transport-specific fields
        if (currentTransport === 'stdio') {
            // Command field
            fields.push(
                ValidatorInput({
                    ctx,
                    formName: 'serverModal',
                    fieldName: 'command',
                    validator: validators.command,
                }),
            );

            // Args field - note: args is optional array, needs special handling
            // For now, we'll skip args since it's an array type
            // TODO: Add support for array input (space-separated strings)
        } else {
            // URL field for HTTP/SSE
            fields.push(
                ValidatorInput({
                    ctx,
                    formName: 'serverModal',
                    fieldName: 'url',
                    validator: validators.url,
                }),
            );
        }

        // Description field (optional textarea)
        fields.push(
            ValidatorInput({
                ctx,
                formName: 'serverModal',
                fieldName: 'description',
                validator: validators.description,
            }),
        );

        return fields;
    };

    // Handle form submission
    const handleSubmit = async (e: Event) => {
        e.preventDefault();

        // Get form element for native validation
        const form = e.target as HTMLFormElement;

        // Use native HTML5 validation
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // Submit form
        await app.saveServer();
    };

    // Centered lightbox modal with backdrop
    return {
        div: {
            id: 'modal-backdrop',
            onClick: (e: Event) => {
                // Close modal when clicking backdrop
                if (e.target === e.currentTarget) {
                    ctx.setState('ui.showServerModal', false);
                }
            },
            children: [
                {
                    div: {
                        id: 'modal-dialog',
                        onClick: (e: Event) => {
                            // Prevent clicks inside dialog from closing modal
                            e.stopPropagation();
                        },
                        children: [
                            {
                                article: {
                                    children: [
                                        {
                                            header: {
                                                children: [
                                                    {
                                                        h2: {
                                                            text: modalMode === 'create' ? 'Add New Server' : 'Edit Server',
                                                        },
                                                    },
                                                ],
                                            },
                                        },
                                        {
                                            form: {
                                                children: buildFormFields(),
                                                onSubmit: handleSubmit,
                                            },
                                        },
                                        {
                                            footer: {
                                                children: [
                                                    {
                                                        button: {
                                                            type: 'button',
                                                            text: 'Cancel',
                                                            onClick: () => {
                                                                ctx.setState('ui.showServerModal', false);
                                                            },
                                                        },
                                                    },
                                                    {
                                                        button: {
                                                            type: 'submit',
                                                            text: modalMode === 'create' ? 'Create' : 'Update',
                                                            onClick: handleSubmit,
                                                        },
                                                    },
                                                ],
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                },
            ],
        },
    };
}
