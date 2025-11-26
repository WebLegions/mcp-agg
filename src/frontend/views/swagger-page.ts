import type { j } from '../main';

/** Module-level state for theme synchronization */
let themeObserver: MutationObserver | undefined;
let messageHandler: ((event: MessageEvent) => void) | undefined;

/** Setup theme synchronization for an iframe element */
/* istanbul ignore next - testing messages across frames is out of scope*/
function setupThemeSync() {
    console.log('[Swagger-parent] Setting up theme sync for iframe');

    const iframe = document.querySelector('iframe[src="/api/v1/swagger"]') as HTMLIFrameElement;
    if (!iframe) {
        console.error('[Swagger-parent] Could not find iframe');
        return;
    }

    // Cleanup any existing observers/handlers
    if (themeObserver) {
        themeObserver.disconnect();
    }

    if (messageHandler) {
        window.removeEventListener('message', messageHandler);
    }

    // Listen for theme changes from parent window
    messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data && event.data.type === 'scalar-ready') {
            console.log('[Swagger-parent] Scalar ready');
        }
    };
    window.addEventListener('message', messageHandler);

    // Watch for theme changes on document element and update post msg to iframe
    themeObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'color-scheme') {
                iframe?.contentWindow?.postMessage?.({ type: 'theme-change' }, window.location.origin);
            }
        }
    });

    themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['color-scheme'],
    });

    // Send initial theme after iframe loads
    iframe.addEventListener('load', () => {
        console.log('[Swagger-parent] Iframe loaded');
    });
}

/** Swagger page component */
export const swaggerPage: j.Component = (_props, _ctx) => {
    // Setup theme sync after component renders
    setTimeout(setupThemeSync, 0);

    return {
        div: {
            children: [
                {
                    iframe: {
                        src: '/api/v1/swagger',
                        style: {
                            width: '100%',
                            height: 'calc(100vh - 4rem)', // Full viewport minus navbar
                            border: 'none',
                        },
                    },
                },
            ],
        },
    };
};
