import { ApiClient } from '../../shared/libs/api-client';
import type { HealthResponse } from '../../shared/types/health';
import { ErrorEx } from '../../shared/utils/error';
import { capitalize, escapeHTML, labelify } from '../../shared/utils/text';
import type { j } from '../main';

export const healthPage: j.Component = async (_props, ctx) => {
    const stateKey = 'health.status';
    const errorKey = 'health.error';
    const dataKey = 'health.data';
    const url = `${ctx.api.baseUrl}../../health`;

    //function parse(data: )



    async function refresh() {
        ctx.setState(stateKey, 'loading');
        ctx.setState(errorKey, '');
        try {
            let text = '';
            let data: HealthResponse;

            try {
                text = await ApiClient.fetch<string>(url, {}, { afterFn: 'text' });
                console.log('HealthResponse', text);
                data = JSON.parse(text) as HealthResponse;
            } catch (e) {
                const err = new ErrorEx(e);
                if (err.message.startsWith('JSON') && !!text) {
                    // something else is answering us. Show it!
                    data = { status: 'Invalid response' } as HealthResponse;
                    Object(data)['Response Text'] = escapeHTML(text);
                } else {
                    throw err;
                }
            }
            if (data.status === 'ok') {
                ctx.setState(stateKey, 'ok');
                ctx.setState(dataKey, JSON.stringify(data, undefined, 2));
            } else {
                ctx.setState(stateKey, 'error');
                ctx.setState(errorKey, 'Health check failure.');
                ctx.setState(dataKey, JSON.stringify(data, undefined, 2));
            }
        } catch (e) {
            const err = new ErrorEx(e);
            ctx.setState(stateKey, 'error');
            ctx.setState(errorKey, capitalize(labelify(err.message).toLowerCase()));
            ctx.setState(dataKey, err.code);
        }
    }

    // initial load
    ctx.setState(dataKey, '');
    ctx.setState(stateKey, 'loading');
    ctx.setState(errorKey, '');
    refresh();

    // I failed to inject @keyframes with js code, so hacking it here:
    const style = document.createElement('style');
    style.textContent = `
        @keyframes blink-fade {
            0%, 100% { opacity: 1; }
            50%      { opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    return {
        main: {
            children: [
                {
                    header: {
                        children: [
                            {
                                h1: {
                                    text: 'System Health',
                                },
                            },
                        ],
                    },
                },
                {
                    section: {
                        children: [
                            () =>
                                ctx.getState(stateKey, 'loading') === 'loading' && {
                                    p: {
                                        id: 'health-page-loading',
                                        children: [
                                            {
                                                span: {
                                                    text: '●',
                                                    style: { animation: 'blink-fade 1s steps(1, start) infinite;' },
                                                },
                                            },
                                            {
                                                span: {
                                                    text: ' Checking...',
                                                    style: { color: 'var(--text-muted, #6b7280);' },
                                                },
                                            },
                                        ],
                                    },
                                },
                            () =>
                                ctx.getState(stateKey, '') === 'ok' && {
                                    p: {
                                        id: 'health-page-ok',
                                        text: '● Operational',
                                        style: { color: `var(--success, #22c55e)` },
                                    },
                                },
                            () =>
                                ctx.getState(stateKey, '') === 'error' && {
                                    p: {
                                        id: 'health-page-error',
                                        text: `● ${ctx.getState(errorKey, '')}`,
                                        style: { color: `var(--danger, #ef4444)` },
                                    },
                                },
                            {
                                pre: {
                                    id: 'health-page-data',
                                    text: () => ctx.getState(dataKey, '...'),
                                },
                            },
                            {
                                button: {
                                    id: 'health-page-refresh-button',
                                    text: 'Refresh',
                                    onClick: refresh,
                                    disabled: () => ctx.getState(stateKey, 'loading') === 'loading',
                                },
                            },
                        ],
                    },
                },
            ],
        },
    };
};
