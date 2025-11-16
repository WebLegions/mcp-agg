/**
 * BaseModal - Reusable modal component
 *
 * A flexible base modal component that can be initialized with a message string
 * and has an OK button that closes it.
 *
 * Designed to be extended by other modal components for custom content and actions.
 * Uses modal backdrop pattern with click-outside-to-close functionality.
 */

import type { JurisContext, JurisInstance, JurisVDOMElement } from '../types/juris';

export interface BaseModalProps {
    /** Unique ID for the modal element */
    id: string;
    /** Modal title */
    title?: string;
    /** Modal message/content (for simple text modals) */
    message?: string;
    /**
     * State key that controls modal visibility and captures button response
     * - When null/undefined: modal is hidden
     * - When set to any value (e.g., 'show', 'prompt'): modal is shown
     * - On button click: state is set to button name (e.g., 'ok', 'cancel', 'save')
     */
    stateKey: string;
    /** Optional custom content (for extending modals) */
    children?: JurisVDOMElement[];
    /** Optional custom footer buttons (for extending modals) */
    footerButtons?: JurisVDOMElement[];
}

/**
 * BaseModal component - Reactive Juris modal
 *
 * Features:
 * - Reactive state-driven visibility
 * - Captures button click responses in state
 * - Backdrop overlay prevents interaction with page content
 * - Click backdrop to close
 * - Simple text message mode or custom content via children
 * - Extensible footer with custom buttons
 *
 * @example
 * // Simple alert modal
 * // State: 'ui.alert' = 'show' (to show), null (hidden), 'ok' (after OK clicked)
 * BaseModal({
 *   ctx,
 *   id: 'alert-modal',
 *   title: 'Success',
 *   message: 'Operation completed!',
 *   stateKey: 'ui.alert'
 * })
 *
 * // Show: setState('ui.alert', 'show')
 * // Read response: if (getState('ui.alert') === 'ok') { ... }
 *
 * @example
 * // Confirm dialog
 * BaseModal({
 *   ctx,
 *   id: 'confirm-modal',
 *   title: 'Confirm Delete',
 *   message: 'Are you sure?',
 *   stateKey: 'ui.confirmDelete',
 *   footerButtons: [
 *     { button: { text: 'Cancel', onClick: (ctx) => ctx.setState('ui.confirmDelete', 'cancel') } },
 *     { button: { text: 'Delete', onClick: (ctx) => ctx.setState('ui.confirmDelete', 'delete') } }
 *   ]
 * })
 */
export function BaseModal(props: BaseModalProps, ctx: JurisContext): JurisVDOMElement {
    const { id, title = 'Modal', message, stateKey, children, footerButtons } = props;

    // Check state to determine if modal should be shown
    const modalState = ctx.getState(stateKey);
    if (!modalState) {
        return { div: {} };
    }

    // Default OK button if no custom buttons provided
    // Sets state to 'ok' when clicked
    const defaultFooterButtons: JurisVDOMElement[] = [
        {
            button: {
                type: 'button',
                text: 'OK',
                onClick: () => {
                    ctx.setState(stateKey, 'ok');
                },
            },
        },
    ];

    const finalFooterButtons = footerButtons || defaultFooterButtons;

    // Content: either simple message or custom children
    const modalContent: JurisVDOMElement[] = message
        ? [
              {
                  p: {
                      text: message,
                  },
              },
          ]
        : children || [];

    return {
        div: {
            id,
            children: [
                {
                    div: {
                        className: 'modal-backdrop',
                        onClick: (e: Event) => {
                            // Close modal when clicking backdrop (set state to null)
                            if (e.target === e.currentTarget) {
                                ctx.setState(stateKey, null);
                            }
                        },
                        children: [
                            {
                                div: {
                                    className: 'modal-dialog',
                                    onClick: (e: Event) => {
                                        // Prevent clicks inside dialog from closing modal
                                        e.stopPropagation();
                                    },
                                    children: [
                                        {
                                            article: {
                                                children: [
                                                    // Header
                                                    {
                                                        header: {
                                                            children: [
                                                                {
                                                                    h2: {
                                                                        text: title,
                                                                    },
                                                                },
                                                                {
                                                                    button: {
                                                                        type: 'button',
                                                                        className: 'close-button',
                                                                        'aria-label': 'Close modal',
                                                                        text: '×',
                                                                        onClick: () => {
                                                                            ctx.setState(stateKey, null);
                                                                        },
                                                                    },
                                                                },
                                                            ],
                                                        },
                                                    },
                                                    // Body
                                                    {
                                                        div: {
                                                            className: 'modal-body',
                                                            children: modalContent,
                                                        },
                                                    },
                                                    // Footer
                                                    {
                                                        footer: {
                                                            className: 'modal-footer',
                                                            children: finalFooterButtons,
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

/**
 * Register BaseModal component with Juris
 */
export function registerBaseModal(juris: JurisInstance) {
    juris.registerComponent('BaseModal', (props, ctx) => BaseModal(props as BaseModalProps, ctx));
}
