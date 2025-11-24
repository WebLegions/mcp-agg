import type { AppComponent } from '../../main';
import type { ReactiveValue, StyleObject } from '../../types/juris';

export interface NavRoute {
    path: string;
    label: string;
}

export interface NavBarProps {
    routes: NavRoute[];
}

export const navBar: AppComponent<NavBarProps> = (props, ctx) => {
    const router = ctx.router;
    const routerKey = router.getState();

    // Nav bar styles using classless CSS variables
    const style: StyleObject = {
        display: 'flex',
        alignItems: 'center',
        padding: 'var(--spacing-base) calc(var(--spacing-base) * 2)',
        background: 'var(--card-bg)',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: 'calc(var(--spacing-base) * 2)',
        gap: 'var(--spacing-base)',
    };

    // Shared base styles for all links - keep font-weight constant to prevent shift
    const baseLinkStyle: StyleObject = {
        textDecoration: 'none',
        padding: 'calc(var(--spacing-base) * 0.5) var(--spacing-base)',
        borderRadius: 'var(--border-radius-md)',
        transition: 'background 0.2s ease, color 0.2s ease, opacity 0.2s ease',
        cursor: 'pointer',
        display: 'inline-block',
        whiteSpace: 'nowrap',
        fontWeight: 'var(--font-weight-bold)',
    };

    // Inactive link styles - same font-weight but lighter appearance via opacity
    const linkStyle: StyleObject = {
        ...baseLinkStyle,
        color: 'var(--body-color)',
        background: 'transparent',
        opacity: '0.7', // Make it appear lighter without changing font-weight
        '&:hover': {
            background: 'var(--bg-hover, rgba(0, 0, 0, 0.05))',
            opacity: '0.85',
        },
    };

    // Active link styles - full opacity for bold appearance
    const activeLinkStyle: StyleObject = {
        ...baseLinkStyle,
        color: 'var(--primary-color)',
        background: 'var(--bg-secondary)',
        opacity: '1', // Full opacity for active state
        '&:hover': {
            background: 'var(--bg-secondary)',
            opacity: '0.95',
        },
    };

    const navigate = (path: string) => (e: Event) => {
        e.preventDefault();
        router.navigate(path);
    };

    // Build navigation links dynamically from routes
    const navLinks = props.routes.map((route) => {
        // Make style reactive to url.path state
        const linkStyleReactive: ReactiveValue<StyleObject> = () => {
            const currentPath = ctx.getState(routerKey, '/');
            const isActive = currentPath === route.path;
            return isActive ? activeLinkStyle : linkStyle;
        };

        // Make aria-current reactive to url.path state
        const ariaCurrent: ReactiveValue<string | undefined> = () => {
            const currentPath = ctx.getState(routerKey, '/');
            return currentPath === route.path ? 'page' : undefined;
        };

        return {
            a: {
                href: route.path,
                text: route.label,
                style: linkStyleReactive,
                'aria-current': ariaCurrent,
                onClick: navigate(route.path),
            },
        };
    });

    return {
        nav: {
            'aria-label': 'Main navigation',
            style: style,
            children: navLinks,
        },
    };
};
