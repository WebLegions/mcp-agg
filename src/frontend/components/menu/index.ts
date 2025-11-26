/**
 * Dropdown Menu Component
 * Simple dropdown menu with keyboard navigation support
 */

import { slugify } from '../../../shared/utils/text';
import type { j } from '../../main';

export type MenuItem =
    | { type: 'item'; slug?: string; text: string; onClick: (slug: string) => void; shortcut?: string; disabled?: boolean }
    | { type: 'separator'; slug?: string }
    | { type: 'label'; slug?: string; text: string }
    | { type: 'submenu'; slug?: string; text: string; items: MenuItem[] };

type MenuItemProps = MenuItem & { [key: string]: unknown };

export type MenuProps = {
    slug: string;
    items: MenuItem[];
    align?: 'start' | 'end';
    xy?: { x: number; y: number };
    onEscape?: () => void;
};

/**
 * Dropdown Menu Item
 */
const menuItem: j.Component<MenuItemProps> = (props, _ctx) => {
    const { slug, text, onClick, shortcut, disabled } = props;

    return {
        div: {
            'menu-id': slug || slugify('item', String(text)),
            className: disabled ? 'menu-item disabled' : 'menu-item',
            onClick: disabled
                ? undefined
                : () => {
                      if (typeof onClick === 'function') onClick(slug);
                  },
            onKeyDown: disabled
                ? undefined
                : (e: KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (typeof onClick === 'function') onClick(slug);
                      }
                  },
            tabIndex: disabled ? undefined : 0,
            children: [
                { span: { text, className: 'menu-item-text' } },
                !!shortcut && {
                    span: {
                        text: shortcut,
                        className: 'menu-item-shortcut',
                    },
                },
            ],
        },
    };
};

/**
 * Menu Separator (horizontal rule)
 */
const menuSeparator: j.Component<{ slug?: string }> = (props, _ctx) => {
    const { slug } = props;
    return {
        hr: {
            'menu-id': slug || 'separator',
            className: 'menu-separator',
        },
    };
};

/**
 * Menu Label (non-interactive header)
 */
const menuLabel: j.Component<MenuItemProps> = (props) => {
    const { text, slug } = props as { text: string; slug?: string };

    return {
        div: {
            'menu-id': slug || slugify('label', text),
            className: 'menu-label',
            text,
        },
    };
};

// Helper function to render menu items from data structure
const renderChildren: j.Component<MenuItem[]> = (menuItems, ctx) => {
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

/**
 * Menu Submenu (nested menu)
 * Note: Submenu functionality is simplified - nested menus open on hover
 */
const menuSub: j.Component<MenuItemProps> = (props, ctx) => {
    const { text, items, slug } = props as { slug: string; text: string; items: MenuItem[] };

    return {
        div: {
            'menu-id': slug,
            className: 'menu-submenu',
            children: [
                {
                    div: {
                        className: 'menu-submenu-trigger',
                        children: [{ span: { text } }, { span: { text: '›', className: 'menu-submenu-arrow' } }],
                    },
                },
                {
                    div: {
                        className: 'menu-submenu-content',
                        children: renderChildren(items, ctx),
                    },
                },
            ],
        },
    };
};

/**
 * Dropdown Menu Component
 */
export const menu: j.Component<MenuProps> = (props, ctx) => {
    const { slug, items, align = 'start', onEscape, xy } = props;

    // ESC key handler using arm() API
    ctx.juris.arm(document, (_ctx) => ({
        onKeyDown: (e: Event) => {
            if (e instanceof KeyboardEvent && e.key === 'Escape') {
                console.log('[menu] ESC key pressed, closing menu');
                onEscape?.();
            }
        },
    }));

    // Click-outside handler - using mousedown (best practice 2024)
    const handleClick = (e: MouseEvent) => {
        const node = e.target as HTMLElement;
        console.log('[menu] Click', node);
        if (node instanceof HTMLElement && !node.hasAttribute('menu-id') && !node.parentElement?.hasAttribute('menu-id')) {
            console.log('[menu] Click outside menu, closing menu');
            onEscape?.();
        }
    };

    // setup click handler and mutation observer right after render:
    // - add click handler
    // - add mutation observer to monitor menu removal >> remove click handler
    setTimeout(() => {
        document.addEventListener('mousedown', handleClick);
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    mutation.removedNodes?.forEach((node) => {
                        if (node instanceof HTMLElement && node.hasAttribute('menu-id')) {
                            console.log('[menu] Menu removed, closing menu');
                            document.removeEventListener('mousedown', handleClick);
                        }
                    });
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // position the menu
        const menuElement = document.querySelector(`[menu-id="${slug}"]`);
        if (menuElement instanceof HTMLElement) {
            const style = menuElement.style;

            const menuRect = menuElement.getBoundingClientRect();
            let top = xy?.y || 100;
            let left = (xy?.x || 100) - (align === 'end' ? menuRect.width : 0);

            // Check vertical space
            if (top + menuRect.height > window.innerHeight) {
                top = top - menuRect.height; // place above
            }

            // Check horizontal space
            if (left + menuRect.width > window.innerWidth) {
                left = window.innerWidth - menuRect.width; // shift left
            }

            style.left = `calc(var(--border-radius-lg) + ${left}px)`;
            style.top = `calc(var(--border-radius-lg) + ${top}px)`;
            style.boxShadow = '0px 8px 16px 0px rgba(0,0,0,0.2)';
            style.visibility = 'visible';
        }
    }, 0);

    return {
        article: {
            className: 'menu',
            style: {
                position: 'absolute',
                visibility: 'hidden',
                zIndex: 1000,
            },
            'menu-id': slug,
            role: 'menu',
            children: renderChildren(items, ctx),
        },
    };
};
