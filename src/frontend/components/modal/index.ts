/**
 * Modal - Reusable modal component using div-based overlay
 *
 * A flexible modal component that uses fixed positioning
 * for reliable cross-browser modal behavior without lifecycle hooks.
 *
 * Designed to be extended by other modal components for custom content and actions.
 * Uses manual backdrop div for styling and click-outside-to-close functionality.
 */

import type { App, AppComponent } from '../../main';
import type { JurisVDOMElement, ReactiveValue, StyleObject } from '../../types/juris';
import { closeIcon, icon } from '../icon';

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
export const modal: AppComponent<ModalProps> = (props, ctx) => {
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
    const style: StyleObject = {
        // Modal backdrop - fixed overlay
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        background: 'color-mix(in srgb, var(--body-bg) 70%, transparent)',
        backdropFilter: 'blur(2px)',
        display: () => (ctx.getState(stateKey) ? 'flex' : 'none'),
        alignItems: 'center',
        justifyContent: 'center',
        zIndex,
        padding: 'var(--spacing-base)',

        // Child selectors for the dialog
        '& .dialog': {
            background: 'var(--card-bg)',
            maxWidth: '90vw',
            maxHeight: '90vh',
            width: '100%',
            padding: '0',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius-lg)',
            boxShadow: 'var(--shadow-md)',
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

        // Header with title and close button - matches table header style (thead/th)
        '& .dialog header': {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            // Matches th,td padding
            padding: 'calc(var(--spacing-base) * 0.75) var(--spacing-base)',
            borderBottom: '1px solid var(--border-color)',
            // Matches thead background
            background: 'var(--gradient-secondary)',
        },

        '& .dialog header h2, & .dialog header h3': {
            margin: '0',
            // Matches th text styles exactly
            fontSize: '0.875rem',
            fontWeight: 'var(--font-weight-bold)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'white', // Matches classless.css th: color: white
        },

        // Close icon in header - white to match th text on gradient background
        '& .dialog header .icon-container .icon-bg': {
            fill: 'transparent',
            stroke: 'white',
            strokeWidth: '1px',
        },

        '& .dialog header .icon-container .icon-text': {
            fill: 'white',
        },

        '& .dialog header .icon-container:hover .icon-bg': {
            fill: 'color-mix(in srgb, white 10%, transparent)',
        },

        // Modal body - scrollable content
        '& .dialog .body': {
            flex: '1',
            padding: 'var(--spacing-base)',
            overflowY: 'auto',
            background: 'var(--card-bg)',
            color: 'var(--body-color)',
        },

        // Modal footer with action buttons
        '& .dialog footer.footer': {
            display: 'flex',
            gap: 'calc(var(--spacing-base) * 0.75)',
            justifyContent: 'flex-end',
            padding: 'var(--spacing-base)',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--card-bg)',
        },

        // Form inside modal
        '& .dialog form': {
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-base)',
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
            style,
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
                                            icon: {
                                                image: closeIcon,
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
};

/**
 * Register Modal component with App
 */
export function registerModal(app: App): void {
    app.registerComponent('icon', icon as never);
    app.registerComponent('modal', modal as never);
}
