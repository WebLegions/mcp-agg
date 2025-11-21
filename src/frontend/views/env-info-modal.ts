import { Env } from '../../shared/utils/env';
import { Modal } from '../components/modal';
import type { JurisContext, JurisInstance, JurisVDOMElement } from '../types/juris';

export interface EnvInfoModalProps {
    stateKey: string;
}

export function EnvInfoModal(props: EnvInfoModalProps, ctx: JurisContext): JurisVDOMElement {
    // Get Env.vars (browser-safe)
    let envVars: Record<string, string> = {};
    try {
        envVars = Object(window).env ?? {};
    } catch {
        envVars = {};
    }

    // Build environment info display
    const envInfo = [
        `Runtime: ${Env.runtime}`,
        `Runtime Version: ${Env.runtimeVer}`,
        `Node Environment: ${Env.nodeEnv}`,
        `App Name: ${Env.appName}`,
        `App Version: ${Env.appVersion}`,
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
                            text: Object.entries(envVars)
                                .sort(([k1], [k2]) => k1 > k2 ? 1 : -1)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join('\n'),
                        },
                    },
                ],
            },
        },
    ];

    // Use Modal composition pattern with higher z-index to appear above other modals
    return Modal(
        {
            id: 'env-info-modal',
            title: 'Environment Info',
            stateKey: props.stateKey,
            children: modalContent,
            zIndex: 1100,
        },
        ctx,
    );
}

export function registerEnvInfoModal(juris: JurisInstance) {
    juris.registerComponent('EnvInfoModal', (props, ctx) => EnvInfoModal(props as EnvInfoModalProps, ctx));
}
