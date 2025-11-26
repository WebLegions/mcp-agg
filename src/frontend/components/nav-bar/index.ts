import type { j } from '../../main';

export interface NavRoute {
    path: string;
    label: string;
}

export interface NavBarProps {
    routes: NavRoute[];
}

export const navBar: j.Component<NavBarProps> = (props, ctx) => {
    const router = ctx.router;

    const style = {
        nav: {
            display: 'flex',
            alignItems: 'center',
            padding: 'var(--spacing-base) calc(var(--spacing-base) * 2)',
            background: 'var(--card-bg)',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: 'calc(var(--spacing-base) * 2)',
            gap: 'var(--spacing-base)',
        },
        linkBase: {
            textDecoration: 'none',
            padding: 'calc(var(--spacing-base) * 0.5) var(--spacing-base)',
            borderRadius: 'var(--border-radius-md)',
            transition: 'background 0.2s ease, color 0.2s ease, opacity 0.2s ease',
            cursor: 'pointer',
            display: 'inline-block',
            whiteSpace: 'nowrap',
            fontWeight: 'var(--font-weight-bold)' as never,
        },
        linkActive: {
            color: 'var(--primary-color)',
            background: 'var(--bg-secondary)',
            opacity: 1,
        },
        linkActiveHover: {
            background: 'var(--bg-secondary)',
            opacity: 0.95,
        },
        linkInactive: {
            color: 'var(--body-color)',
            background: 'transparent',
            opacity: 0.7,
        },
        linkInactiveHover: {
            background: 'var(--bg-hover, rgba(0, 0, 0, 0.05))',
            opacity: 0.85,
        },
    };

    return {
        nav: {
            'aria-label': 'Main navigation',
            style: style.nav,
            children: props.routes.map((route) => ({
                a: {
                    href: route.path,
                    text: route.label,
                    // Single reactive style function per link
                    style: (): j.Style => {
                        const currentPath = ctx.getState('url.path', '/');
                        const isActive = currentPath === route.path;

                        // Return merged active or inactive styles
                        return (isActive
                            ? {
                                  ...style.linkBase,
                                  ...style.linkActive,
                                  '&:hover': style.linkActiveHover,
                              }
                            : {
                                  ...style.linkBase,
                                  ...style.linkInactive,
                                  '&:hover': style.linkInactiveHover,
                              }) as unknown as j.Style;
                    },
                    'aria-current': () => {
                        const currentPath = ctx.getState('url.path', '/');
                        return currentPath === route.path ? 'page' : undefined;
                    },
                    onClick: (e: Event) => {
                        e.preventDefault();
                        router.navigate(route.path);
                    },
                },
            })),
        },
    };
};
