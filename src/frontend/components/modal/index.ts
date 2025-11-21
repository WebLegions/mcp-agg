/**
 * Modal - Reusable modal component using div-based overlay
 *
 * A flexible modal component that uses fixed positioning
 * for reliable cross-browser modal behavior without lifecycle hooks.
 *
 * Designed to be extended by other modal components for custom content and actions.
 * Uses manual backdrop div for styling and click-outside-to-close functionality.
 */

import type { ExtendedStyleObject, JurisContext, JurisInstance, JurisVDOMElement, ReactiveValue } from '../../types/juris';
import { closeIcon, registerIcon } from '../icon';

export interface ModalProps {
    /** Unique ID for the modal element */
    id: string;
    /** Modal title */
    title?: ReactiveValue<string>;
    /** Modal message/content (for simple text modals) */
    message?: ReactiveValue<string>;
    /**
     * State key that controls modal visibility and captures button response
     * - When empty string: modal is hidden
     * - When set to any value (e.g., 'show', 'prompt'): modal is shown
     * - On button click: state is set to button name (e.g., 'ok', 'cancel', 'save')
     */
    stateKey: string;
    /** Optional custom content (for extending modals) */
    children?: JurisVDOMElement[];
    /** Optional custom footer buttons (for extending modals) */
    footerButtons?: JurisVDOMElement[];
    /** Optional z-index for modal stacking (default: 1000) */
    zIndex?: number;
}

/**
 * Modal component - Reactive Juris modal using div overlay
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
 * Modal({
 *   id: 'alert-modal',
 *   title: 'Success',
 *   message: 'Operation completed!',
 *   stateKey: 'ui.alert'
 * }, ctx)
 */
export function Modal(props: ModalProps, ctx: JurisContext): JurisVDOMElement {
    const { id, title = 'Modal', message, stateKey, children, footerButtons, zIndex = 1000 } = props;

    // Default OK button if no custom buttons provided
    const defaultFooterButtons: JurisVDOMElement[] = [
        {
            button: {
                type: 'button',
                text: 'OK',
                onClick: () => {
                    ctx.setState(stateKey, '');
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

    // CSSExtractor Styles
    const styles: ExtendedStyleObject = {
        // Modal backdrop - fixed overlay
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        background: 'color-mix(in srgb, var(--body-bg, black) 70%, transparent)',
        backdropFilter: 'blur(2px)',
        display: () => (ctx.getState(stateKey) ? 'flex' : 'none'),
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: zIndex,
        padding: '1rem',

        // Child selectors for the dialog
        '& .dialog': {
            background: 'var(--card-bg, white)',
            maxWidth: '90vw',
            maxHeight: '90vh',
            width: '100%',
            padding: '0',
            border: '1px solid var(--border-color, rgba(128, 128, 128, 0.3))',
            borderRadius: '8px',
            boxShadow: `0 4px 6px color-mix(in srgb, var(--body-bg, black) 10%, transparent),
                        0 10px 20px color-mix(in srgb, var(--body-bg, black) 15%, transparent)`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
        },

        // Dialog article container
        '& .dialog article': {
            margin: '0',
            padding: '0',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '200px',
            maxHeight: '90vh',
            border: 'none',
        },

        // Header with title and close button - matches table header style
        '& .dialog header': {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 'calc(var(--spacing-base, 1rem) * 0.75) 1.5rem',
            borderBottom: '1px solid var(--border-color, rgba(128, 128, 128, 0.2))',
            background: 'var(--gradient-secondary, linear-gradient(135deg, var(--secondary, #6366f1) 0%, var(--secondary-light, #818cf8) 100%))',
            color: '#fff',
        },

        '& .dialog header h2, & .dialog header h3': {
            margin: '0',
            fontSize: '0.875rem',
            fontWeight: 'var(--font-weight-bold, 700)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#fff',
        },

        // Close icon in header - override to white for dark gradient background
        '& .dialog header .icon-container': {
            '--icon-color': '#fff',
        },

        '& .dialog header .icon-container svg': {
            color: '#fff',
        },

        '& .dialog header .icon-container .icon-bg': {
            fill: 'transparent',
            stroke: '#fff',
            strokeWidth: '1px',
        },

        '& .dialog header .icon-container .icon-text': {
            fill: '#fff',
        },

        '& .dialog header .icon-container:hover .icon-bg': {
            fill: 'rgba(255, 255, 255, 0.1)',
        },

        // Modal body - scrollable content
        '& .dialog .body': {
            flex: '1',
            padding: '1.5rem',
            overflowY: 'auto',
            background: 'var(--card-bg, white)',
            color: 'var(--body-color, #1e293b)',
        },

        // Modal footer with action buttons
        '& .dialog footer.footer': {
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'flex-end',
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-color, rgba(128, 128, 128, 0.2))',
            background: 'var(--card-bg, white)',
        },

        // Form inside modal
        '& .dialog form': {
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
        },

        // Responsive sizing
        '@media (min-width: 640px)': {
            '& .dialog': {
                minWidth: '500px',
                width: 'auto',
            },
        },
    };

    return {
        div: {
            id,
            className: 'backdrop',
            style: styles,
            onClick: (e: Event) => {
                // Close modal when clicking backdrop (outside dialog)
                if (e.target === e.currentTarget) {
                    ctx.setState(stateKey, '');
                }
            },
            children: [
                {
                    article: {
                        // Use article to get classless card styles
                        className: 'dialog',
                        onClick: (e: Event) => {
                            // Prevent clicks inside dialog from closing modal
                            e.stopPropagation();
                        },
                        children: [
                            // Header
                            {
                                header: {
                                    children: [
                                        {
                                            h3: {
                                                // Use h3 for modal title as it's smaller than h1/h2
                                                text: title,
                                            },
                                        },
                                        {
                                            Icon: {
                                                svg: closeIcon,
                                                onClick: () => {
                                                    ctx.setState(stateKey, '');
                                                },
                                                ariaLabel: 'Close modal',
                                                title: 'Close',
                                            },
                                        },
                                    ],
                                },
                            },
                            // Body
                            {
                                div: {
                                    className: 'body',
                                    children: modalContent,
                                },
                            },
                            // Footer
                            {
                                footer: {
                                    className: 'footer',
                                    children: finalFooterButtons,
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
 * Register Modal component with Juris
 */
export function registerModal(juris: JurisInstance): void {
    registerIcon(juris);
    juris.registerComponent('Modal', (props, ctx) => Modal(props as ModalProps, ctx));
}
