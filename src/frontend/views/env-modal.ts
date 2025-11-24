import { Env } from '../../shared/utils/env';
import { modal } from '../components/modal';
import type { AppComponent } from '../main';

export const envModal: AppComponent = (_props, ctx) => {
    // Build environment info display
    const envInfo = [
        `Runtime: ${Env.runtime} `,
        `Runtime Version: ${Env.runtimeVer} `,
        `Node Environment: ${Env.nodeEnv} `,
        `App Name: ${Env.appName} `,
        `App Version: ${Env.appVersion} `,
    ];

    // Modal content
    const modalContent = [
        {
            div: {
                style: { fontFamily: 'monospace', fontSize: '0.95em', marginBottom: '1em' },
                children: [
                    {
                        pre: {
                            text: envInfo.join('\n'),
                        },
                    },
                ],
            },
        },
        {
            div: {
                children: [
                    { p: { text: 'Environment Variables:' } },
                    {
                        pre: {
                            text: Object.entries(Env.vars ?? {})
                                .sort(([k1], [k2]) => (k1 > k2 ? 1 : -1))
                                .map(([k, v]) => `${k}: ${v}`)
                                .join('\n'),
                        },
                    },
                ],
            },
        },
    ];

    // Use Modal composition pattern with higher z-index to appear above other modals
    return modal(
        {
            id: 'env-modal',
            title: 'Environment Info',
            stateKey: 'ui.showEnvModal',
            children: modalContent,
            zIndex: 1100,
        },
        ctx,
    );
};
