/**
 * Fastify posthook: Injects all env vars starting with "C_" into window.env on public HTML pages.
 * Usage: Register as a Fastify onSend hook for public folder routes.
 */
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Env } from '../utils';

export async function injectEnvPosthook(_request: FastifyRequest, reply: FastifyReply, payload: unknown) {
    if (typeof payload !== 'string' || !reply.getHeader('content-type')?.toString().includes('text/html')) {
        return payload;
    }
    // Build script to inject env vars
    const scriptBlock = `
<script>
    window.env = window.env || {};
    window.env['NODE_ENV']='${Env.nodeEnv}';
    window.env['APP_NAME']='${Env.appName}';
    window.env['APP_VERSION']='${Env.appVersion}';
    ${Object.entries(process.env)
        .filter(([key]) => key.startsWith('C_'))
        .map(([key, value]) => `window.env['${key}'] = ${JSON.stringify(value)};\n`)
        .join('')}
</script>
<script type="speculationrules">
    {
        "prerender": [{ "source": "document", "eagerness": "moderate" }]
    }
</script>
    `;
    // Inject script after <head> tag
    return payload.replace(/<head>/i, `<head>${scriptBlock}`);
}
