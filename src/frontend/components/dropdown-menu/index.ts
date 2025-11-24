/**
 * Dropdown Menu Component
 * A flexible dropdown menu with support for nested submenus, keyboard navigation,
 * and accessibility features. Uses inline ExtendedStyleObject for styling.
 */

import type { AppComponent } from '../../main';
import type { JurisVDOMElement, StyleObject } from '../../types/juris';
import { mergeStyles } from '../../utils/style-helpers';

// Individual prop interfaces for internal components
export interface MenuItemProps {
    type: 'item';
    /** Item text */
    text: string;
    /** Click handler */
    onClick?: () => void;
    /** Keyboard shortcut to display */
    shortcut?: string;
    /** Whether item is disabled */
    disabled?: boolean;
}

export interface MenuLabelProps {
    type: 'label';
    /** Label text */
    text: string;
}

export interface MenuSubProps {
    type: 'submenu';
    /** Unique ID for submenu state */
    id: string;
    /** Trigger text */
    triggerText: string;
    /** Submenu items */
    items: MenuItem[];
}

// Public MenuItem type composed from the prop interfaces
export type MenuItem = MenuItemProps | { type: 'separator' } | MenuLabelProps | MenuSubProps;

export interface MenuProps {
    /** Unique ID for state management */
    id: string;
    /** Trigger element (button, icon, etc.) */
    trigger: JurisVDOMElement;
    /** Menu items as data structure */
    items: MenuItem[];
    /** Alignment of dropdown relative to trigger */
    align?: 'start' | 'end';
}

/**
 * Dropdown Menu Styles
 */
const styles: StyleObject = {
    menu: {
        position: 'relative',
        display: 'inline-block',
    },

    trigger: {
        cursor: 'pointer',
    },

    content: {
        position: 'absolute',
        top: 'calc(100% + 0.5rem)',
        minWidth: '14rem',
        maxWidth: '20rem',
        padding: '0.5rem',
        zIndex: 1000,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        animation: 'dropdown-fade-in 0.15s ease-out',
        '@media (prefers-color-scheme: dark)': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        },
    },

    alignStart: {
        left: '0',
    },

    alignEnd: {
        right: '0',
    },

    item: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '0.5rem 0.75rem',
        cursor: 'pointer',
        borderRadius: '0.25rem',
        transition: 'background-color 0.15s ease',
        outline: 'none',
        ':hover': {
            backgroundColor: 'var(--border-color)',
        },
        ':focus': {
            backgroundColor: 'var(--border-color)',
        },
    },

    itemDisabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
        pointerEvents: 'none',
    },

    itemText: {
        flex: 1,
        whiteSpace: 'nowrap',
    },

    shortcut: {
        opacity: 0.6,
        fontSize: '0.75rem',
    },

    label: {
        padding: '0.5rem 0.75rem',
        fontWeight: 600,
        opacity: 0.8,
    },

    separator: {
        margin: '0.5rem 0',
        border: 'none',
        borderTop: '1px solid var(--border-color)',
    },

    sub: {
        position: 'relative',
    },

    subTrigger: {
        position: 'relative',
    },

    subArrow: {
        marginLeft: 'auto',
        opacity: 0.6,
    },

    subContent: {
        position: 'absolute',
        left: 'calc(100% + 0.25rem)',
        top: '-0.5rem',
        animation: 'dropdown-fade-in 0.15s ease-out',
    },
};

/**
 * Dropdown Menu Item
 */
const menuItem: AppComponent<MenuItemProps> = (props, ctx) => {
    const { text, onClick, shortcut, disabled } = props;

    const itemStyle = disabled ? mergeStyles(styles.item, styles.itemDisabled) : styles.item;

    return {
        div: {
            style: itemStyle,
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
                    e.preventDefault();
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
                        style: styles.itemText,
                    },
                },
                shortcut
                    ? {
                          small: {
                              text: shortcut,
                              style: styles.shortcut,
                          },
                      }
                    : null,
            ].filter(Boolean),
        },
    };
};

/**
 * Dropdown Menu Label
 */
const menuLabel: AppComponent<MenuLabelProps> = (props, _ctx) => {
    return {
        div: {
            style: styles.label,
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
};

/**
 * Dropdown Menu Separator
 */
const menuSeparator: AppComponent = (_props, _ctx) => {
    return {
        hr: {
            style: styles.separator,
            role: 'separator',
        },
    };
};

/**
 * Dropdown Menu Submenu
 */
const menuSub: AppComponent<MenuSubProps> = (props, ctx) => {
    const { id, triggerText, items } = props;
    const stateKey = 'servers.menuId';
    const isOpen = ctx.getState(stateKey) === id;

    const subTriggerStyle = mergeStyles(styles.item, styles.subTrigger);
    const subContentStyle = mergeStyles(styles.content, styles.subContent);

    return {
        div: {
            style: styles.sub,
            children: [
                // Submenu trigger
                {
                    div: {
                        style: subTriggerStyle,
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
                                    style: styles.itemText,
                                },
                            },
                            {
                                small: {
                                    text: '›',
                                    style: styles.subArrow,
                                },
                            },
                        ],
                    },
                },
                // Submenu content
                isOpen
                    ? {
                          article: {
                              style: subContentStyle,
                              role: 'menu',
                              children: items,
                          },
                      }
                    : null,
            ].filter(Boolean),
        },
    };
};

/**
 * Dropdown Menu
 */
export const menu: AppComponent<MenuProps> = (props, ctx) => {
    const { id, trigger, items, align = 'start' } = props;
    const stateKey = 'servers.menuId';
    const isOpen = ctx.getState(stateKey) === id;

    const contentStyle = mergeStyles(styles.content, align === 'start' ? styles.alignStart : styles.alignEnd);

    // Helper function to render menu items from data structure
    const renderChildren = (menuItems: MenuItem[]): JurisVDOMElement[] => {
        return menuItems.map((item) => {
            switch (item.type) {
                case 'item':
                    return menuItem(item, ctx);
                case 'separator':
                    return menuSeparator(item, ctx);
                case 'label':
                    return menuLabel(item, ctx);
                case 'submenu':
                    return menuSub(item, ctx);
                default:
                    return { div: { text: 'Unknown menu item type' } };
            }
        });
    };

    return {
        div: {
            style: styles.menu,
            children: [
                // Trigger
                {
                    div: {
                        style: styles.trigger,
                        onClick: (e: MouseEvent) => {
                            console.log('[DropdownMenu] Trigger clicked, isOpen:', isOpen, 'id:', id);
                            e.stopPropagation();
                            ctx.setState(stateKey, isOpen ? '' : id);
                            console.log('[DropdownMenu] State set to:', isOpen ? '' : id);
                        },
                        children: [trigger],
                    },
                },
                // Content
                isOpen
                    ? {
                          article: {
                              style: contentStyle,
                              role: 'menu',
                              oncreate: (vnode: { dom: HTMLElement }) => {
                                  // Click outside to close
                                  const handleClickOutside = (e: MouseEvent) => {
                                      const menuDiv = vnode.dom.parentElement;
                                      if (menuDiv && !menuDiv.contains(e.target as Node)) {
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
                              children: renderChildren(items),
                          },
                      }
                    : null,
            ].filter(Boolean),
        },
    };
};
