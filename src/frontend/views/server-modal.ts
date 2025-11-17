/**
 * Server Modal View
 * Form for creating/editing MCP servers using semantic HTML and ValidatorInput
 * Uses ValidatorInput component for automatic validation from schemas
 * Extends BaseModal for consistent modal behavior using HTML Popover API
 */

import { mcpHTTPServerSchema, mcpSSEServerSchema, mcpStdioServerSchema } from '../../shared/types/mcp-config';
import { dotify, slugify } from '../../shared/utils/text';
import { BaseModal } from '../components/base-modal';
import { extractFieldValidators, ValidatorInput } from '../components/validator-input';
import type { McpConfigApp } from '../main';
import type { JurisContext, JurisInstance, JurisVDOMElement } from '../types/juris';

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
    const modalMode = ctx.getState<string>('ui.serverModalMode', 'create');
    const { app } = props;

    // Helper function to build form fields based on current transport
    // This will be called reactively when transport changes
    const buildFormFields = (): JurisVDOMElement[] => {
        const transportStateKey = dotify('serverModal', 'transport');
        const currentTransport = ctx.getState<string>(transportStateKey, 'stdio');
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
                            value: (): string => ctx.getState(transportStateKey, 'stdio'),
                            onChange: (e: Event) => {
                                const value = (e.target as HTMLSelectElement).value;
                                ctx.setState(transportStateKey, value);
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

    // Modal content: form with fields
    const modalContent: JurisVDOMElement[] = [
        {
            form: {
                children: buildFormFields(),
                onSubmit: handleSubmit,
            },
        },
    ];

    // Modal footer buttons
    // Note: These set the state to button names ('cancel', 'save')
    const footerButtons: JurisVDOMElement[] = [
        {
            button: {
                type: 'button',
                text: 'Cancel',
                onClick: () => {
                    ctx.setState('ui.showServerModal', 'cancel');
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
    ];

    // Use BaseModal with reactive state control
    // State 'ui.showServerModal' controls visibility:
    // - null/false: hidden
    // - truthy value (e.g., true, 'show'): shown
    // - 'cancel': user clicked cancel
    // - Any other value: modal was closed
    return BaseModal(
        {
            id: 'server-modal',
            title: modalMode === 'create' ? 'Add New Server' : 'Edit Server',
            stateKey: 'ui.showServerModal',
            children: modalContent,
            footerButtons,
        },
        ctx,
    );
}

/**
 * Register ServerModal component with Juris
 */
export function registerServerModal(juris: JurisInstance, app: McpConfigApp) {
    juris.registerComponent('ServerModal', (props, ctx) => ServerModal({ ...props, app }, ctx));
}
