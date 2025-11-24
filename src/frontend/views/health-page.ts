import type { AppComponent } from '../main';

export const healthPage: AppComponent = (_props, ctx) => {
    const stateKey = 'health.status';
    const errorKey = 'health.error';

    // Get current state or initialize
    let status = ctx.getState(stateKey, '');
    if (!status) {
        status = 'loading';
        ctx.setState(stateKey, 'loading');
        ctx.setState(errorKey, '');
    }

    const errorMsg = ctx.getState(errorKey, '');

    // Fetch health status on mount (only if status is loading)
    if (status === 'loading') {
        fetch('/health')
            .then(async (response) => {
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: response.statusText }));
                    ctx.setState(stateKey, 'error');
                    ctx.setState(errorKey, errorData.error || response.statusText);
                } else {
                    ctx.setState(stateKey, 'ok');
                }
            })
            .catch((error: Error) => {
                ctx.setState(stateKey, 'error');
                ctx.setState(errorKey, error.message || 'Network error');
            });
    }

    const isOk = status === 'ok';
    const isError = status === 'error';
    const _isLoading = status === 'loading';

    return {
        div: {
            style: {
                color: 'var(--body-color)',
            },
            children: [
                {
                    h1: {
                        text: 'System Health',
                        style: { marginBottom: '1rem' },
                    },
                },
                {
                    div: {
                        style: {
                            background: 'var(--card-bg)',
                            border: 'var(--border-color)',
                            borderRadius: 'var(--border-radius-lg)',
                        },
                        children: [
                            {
                                span: {
                                    text: isOk ? '●' : isError ? '●' : '○',
                                    style: {
                                        color: isOk ? '#22c55e' : isError ? '#ef4444' : '#6b7280', // Green / Red / Gray
                                        marginRight: '0.5rem',
                                    },
                                },
                            },
                            {
                                span: {
                                    text: isOk ? 'All Systems Operational' : isError ? `Error: ${errorMsg}` : 'Checking...',
                                },
                            },
                        ],
                    },
                },
            ],
        },
    };
};
