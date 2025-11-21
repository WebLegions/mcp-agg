/**
 * Dropdown Menu Component
 * A flexible dropdown menu with support for nested submenus, keyboard navigation,
 * and accessibility features. Uses classless CSS framework for styling.
 */

import type { JurisComponentFunction, JurisContext, JurisInstance, JurisVDOMElement } from '../../types/juris';
import { loadCss } from '../../utils/helpers';

export interface DropdownMenuProps {
    /** Unique ID for state management */
    id: string;
    /** Trigger element (button, icon, etc.) */
    trigger: JurisVDOMElement;
    /** Menu content items */
    children: JurisVDOMElement[];
    /** Alignment of dropdown relative to trigger */
    align?: 'start' | 'end';
}

export interface DropdownMenuItemProps {
    /** Item text */
    text: string;
    /** Click handler */
    onClick?: () => void;
    /** Keyboard shortcut to display */
    shortcut?: string;
    /** Whether item is disabled */
    disabled?: boolean;
}

export interface DropdownMenuLabelProps {
    /** Label text */
    text: string;
}

export interface DropdownMenuSubProps {
    /** Unique ID for submenu state */
    id: string;
    /** Trigger text */
    triggerText: string;
    /** Submenu items */
    children: JurisVDOMElement[];
}

/**
 * Dropdown Menu Item
 */
export function DropdownMenuItem(props: DropdownMenuItemProps, ctx: JurisContext): JurisVDOMElement {
    const { text, onClick, shortcut, disabled } = props;

    return {
        div: {
            className: `dropdown-menu-item${disabled ? ' disabled' : ''}`,
            role: 'menuitem',
            tabindex: disabled ? '-1' : '0',
            'aria-disabled': disabled ? 'true' : 'false',
            onClick: () => {
                if (!disabled && onClick) {
                    onClick();
                    ctx.setState('servers.menuId', '');
                }
            },
            onkeydown: (e: KeyboardEvent) => {
                if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault(); // Corrected from e.preventDefauonClick
                    if (onClick) {
                        onClick();
                        ctx.setState('servers.menuId', '');
                    }
                }
            },
            children: [
                {
                    small: {
                        text,
                        className: 'dropdown-menu-item-text',
                    },
                },
                shortcut
                    ? {
                          small: {
                              text: shortcut,
                              className: 'dropdown-menu-shortcut',
                          },
                      }
                    : null,
            ].filter(Boolean),
        },
    };
}

/**
 * Dropdown Menu Label
 */
export function DropdownMenuLabel(props: DropdownMenuLabelProps, _ctx: JurisContext): JurisVDOMElement {
    return {
        div: {
            className: 'dropdown-menu-label',
            role: 'presentation',
            children: [
                {
                    small: {
                        text: props.text,
                    },
                },
            ],
        },
    };
}

/**
 * Dropdown Menu Separator
 */
export function DropdownMenuSeparator(_props: Record<string, never>, _ctx: JurisContext): JurisVDOMElement {
    return {
        hr: {
            className: 'dropdown-menu-separator',
            role: 'separator',
        },
    };
}

/**
 * Dropdown Menu Submenu
 */
export function DropdownMenuSub(props: DropdownMenuSubProps, ctx: JurisContext): JurisVDOMElement {
    const { id, triggerText, children } = props;
    const stateKey = 'servers.menuId';
    const isOpen = ctx.getState(stateKey) === id;

    return {
        div: {
            className: 'dropdown-menu-sub',
            children: [
                // Submenu trigger
                {
                    div: {
                        className: 'dropdown-menu-item dropdown-menu-sub-trigger',
                        role: 'menuitem',
                        tabindex: '0',
                        'aria-haspopup': 'true',
                        'aria-expanded': isOpen ? 'true' : 'false',
                        onClick: () => {
                            ctx.setState(stateKey, isOpen ? '' : id);
                        },
                        onkeydown: (e: KeyboardEvent) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                ctx.setState(stateKey, !isOpen);
                            } else if (e.key === 'ArrowRight') {
                                e.preventDefault();
                                ctx.setState(stateKey, true);
                            }
                        },
                        children: [
                            {
                                small: {
                                    text: triggerText,
                                    className: 'dropdown-menu-item-text',
                                },
                            },
                            {
                                small: {
                                    text: '›',
                                    className: 'dropdown-menu-sub-arrow',
                                },
                            },
                        ],
                    },
                },
                // Submenu content
                isOpen
                    ? {
                          article: {
                              className: 'dropdown-menu-content dropdown-menu-sub-content',
                              role: 'menu',
                              children,
                          },
                      }
                    : null,
            ].filter(Boolean),
        },
    };
}

/**
 * Dropdown Menu
 */
export function DropdownMenu(props: DropdownMenuProps, ctx: JurisContext): JurisVDOMElement {
    const { id, trigger, children, align = 'start' } = props;
    const stateKey = 'servers.menuId';
    const isOpen = ctx.getState(stateKey) === id;

    return {
        div: {
            className: 'dropdown-menu',
            children: [
                // Trigger
                {
                    div: {
                        className: 'dropdown-menu-trigger',
                        onClick: () => {
                            ctx.setState(stateKey, isOpen ? '' : id);
                        },
                        children: [trigger],
                    },
                },
                // Content
                isOpen
                    ? {
                          article: {
                              className: `dropdown-menu-content dropdown-menu-align-${align}`,
                              role: 'menu',
                              oncreate: (vnode: { dom: HTMLElement }) => {
                                  // Click outside to close
                                  const handleClickOutside = (e: MouseEvent) => {
                                      const dropdown = vnode.dom.closest('.dropdown-menu');
                                      if (dropdown && !dropdown.contains(e.target as Node)) {
                                          ctx.setState(stateKey, '');
                                      }
                                  };
                                  setTimeout(() => {
                                      document.addEventListener('click', handleClickOutside);
                                  }, 0);

                                  // Cleanup on destroy
                                  // biome-ignore lint/suspicious/noExplicitAny: DOM element extension for cleanup
                                  (vnode.dom as any)._cleanup = () => {
                                      document.removeEventListener('click', handleClickOutside);
                                  };
                              },
                              ondestroy: (vnode: { dom: HTMLElement }) => {
                                  // biome-ignore lint/suspicious/noExplicitAny: DOM element extension for cleanup
                                  if ((vnode.dom as any)._cleanup) {
                                      // biome-ignore lint/suspicious/noExplicitAny: DOM element extension for cleanup
                                      (vnode.dom as any)._cleanup();
                                  }
                              },
                              onkeydown: (e: KeyboardEvent) => {
                                  if (e.key === 'Escape') {
                                      e.preventDefault();
                                      ctx.setState(stateKey, '');
                                  }
                              },
                              children,
                          },
                      }
                    : null,
            ].filter(Boolean),
        },
    };
}

/**
 * Register Dropdown Menu components with Juris
 */
export function registerDropdownMenu(juris: JurisInstance): void {
    loadCss('/app/components/dropdown-menu/style.css');
    juris.registerComponent('DropdownMenu', DropdownMenu as JurisComponentFunction);
    juris.registerComponent('DropdownMenuItem', DropdownMenuItem as JurisComponentFunction);
    juris.registerComponent('DropdownMenuLabel', DropdownMenuLabel as JurisComponentFunction);
    juris.registerComponent('DropdownMenuSeparator', DropdownMenuSeparator as JurisComponentFunction);
    juris.registerComponent('DropdownMenuSub', DropdownMenuSub as JurisComponentFunction);
}
