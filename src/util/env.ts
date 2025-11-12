import cluster from 'node:cluster';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import * as worker from 'node:worker_threads';
import { isDebugging } from './debugger';
import type { Dict } from './immutable';
import { createLogger, LogLevel } from './logger';

export class Env {
    static get runtime(): 'node' | 'bun' {
        return process.versions.bun ? 'bun' : 'node';
    }
    static get runtimeVer() {
        return parseFloat(process.versions.bun?.substring(0) ?? process.versions.node?.substring(0));
    }
    static get isPrimary() {
        return cluster.isPrimary;
    }
    static get workerId() {
        return cluster.isWorker ? cluster.worker!.id.toString() : '';
    }
    static get isMainThread() {
        return worker.isMainThread;
    }
    static get threadId() {
        return worker.threadId;
    }
    static get __dirname() {
        const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
        return dir;
    }
    static get uvThreadpool() {
        return Number(process.env.UV_THREADPOOL_SIZE) || 4;
    }

    private static _pkg?: Dict;
    static get pkg() {
        return Env._pkg ?? (Env._pkg = JSON.parse(fs.readFileSync(resolve(Env.__dirname, 'package.json'), 'utf8')));
    }
    static get appName() {
        return Env.get('APP_NAME', Env.pkg.name || basename(process.execPath));
    }
    static get appVersion() {
        return Env.pkg.version;
    }
    static get podName() {
        return Env.get('POD_NAME', '');
    }
    static get podNamespace() {
        return Env.get('POD_NAMESPACE', '');
    }
    static get hostname() {
        return Env.get('HOSTNAME', os.hostname());
    }
    static get nodeEnv() {
        return Env.get('NODE_ENV', 'development');
    }

    static get hasDOM() {
        return (
            typeof Object(globalThis).window !== 'undefined' &&
            typeof Object(globalThis).document !== 'undefined' &&
            typeof Object(globalThis).document.querySelector === 'function'
        );
    }

    /**
     * Constructor: setup environment.
     */
    constructor() {
        Env.init();
        process.title = Env.appName;
    }

    /**
     * Load environment variables from .env file and set defaults if not set.
     */
    static init() {
        const { env, argv } = process;

        // Set NODE_ENV: defaults to 'development', or 'production' in Docker
        env.NODE_ENV ??= Env.nodeEnv;

        // Load .env.{NODE_ENV} file if it exists, otherwise use defaults
        const filename = env.DOT_ENV_FILE ? resolve(env.DOT_ENV_FILE) : resolve(`.env.${env.NODE_ENV}`);
        env.DOT_ENV_FILE ??= filename;

        try {
            const buff = fs.readFileSync(filename);
            const parsed = parseEnv(buff.toString('utf8'));
            if (parsed) {
                // Only set values that are NOT already in the environment
                // This ensures process.env variables take precedence over .env file
                for (const [key, value] of Object.entries(parsed)) {
                    if (env[key] === undefined) {
                        env[key] = value;
                    }
                }
                // Suppress message if --json or --help flag is present (for clean output)
                if (!process.argv.includes('--json') && !process.argv.includes('--help') && !process.argv.includes('-h')) {
                    console.log(`Loaded .env file: ${filename} with ${Object.keys(parsed).length} vars`);
                }
            }
        } catch (_err) {
            // Only warn if not in JSON or help mode
            if (!process.argv.includes('--json') && !process.argv.includes('--help') && !process.argv.includes('-h')) {
                console.warn(`Failed to load .env file: ${filename}`);
            }
        }

        // must have env vars
        env.APP_NAME ??= Env.pkg.name;
        env.HOSTNAME ??= Env.hostname;
        env.LOG_ADD_TIME ??= 'false';
        env.LOG_LEVEL ??= 'INFO';
        env.LOG_FORMAT ??=
            (argv.includes('-json') || argv.includes('--json')) && !(argv.includes('-raw') || argv.includes('--raw'))
                ? 'json'
                : 'raw';
        env.NODE_TEST_CONTEXT ??= String(isDebugging());
        env.POD_NAME ??= '';
        env.POD_NAMESPACE ??= '';
    }

    /**
     * Get environment variable with type casting and validation.
     *
     * @param key - The environment variable key.
     * @param def - The default value if the key is not found.
     * @param min - The minimum value for numeric keys.
     * @param max - The maximum value for numeric keys.
     * @returns The value of the environment variable or the default value.
     */
    static get(key: string, def: number, min?: number, max?: number): number;
    static get(key: string, def: boolean): boolean;
    static get<T extends object>(key: string, def: T): T;
    static get(key: string, def: string, min?: string, max?: string): string;
    static get<T = unknown>(key: string, def: T, min?: T, max?: T): T {
        const raw = process.env[key];
        let rc: unknown;
        switch (typeof def) {
            case 'boolean':
                if (raw === undefined) {
                    rc = false;
                } else {
                    const val = String(raw).toLowerCase();
                    rc = val === 'true' || val === '1';
                }
                break;
            case 'number':
                if (raw === undefined) {
                    rc = Number(def);
                } else {
                    rc = Number(raw);
                }
                if (typeof min === 'number' && (rc as number) < (min as number)) rc = min;
                if (typeof max === 'number' && (rc as number) > (max as number)) rc = max;
                rc = Number.isNaN(rc) ? 0 : rc;
                break;
            case 'string': {
                rc = String(raw ?? def ?? '');
                const minStr = min !== undefined ? String(min) : '';
                const maxStr = max !== undefined ? String(max) : '';
                if (minStr && (rc as string) < minStr) rc = minStr;
                if (maxStr && (rc as string) > maxStr) rc = maxStr;
                break;
            }
            case 'object':
                // If default is object, parse JSON from env var
                if (raw !== undefined && def !== undefined) {
                    try {
                        rc = JSON.parse(raw);
                    } catch {
                        console.error(`Failed to parse JSON from env var ${key}`);
                    }
                }
                break;
        }
        rc ??= def;
        return rc as T;
    }

    static print(log = createLogger()) {
        const save = log.conf.level;
        log.conf.level = LogLevel.INFO;
        const {
            appName,
            appVersion,
            podNamespace,
            podName,
            hostname,
            runtime,
            runtimeVer,
            workerId,
            threadId,
            nodeEnv,
            uvThreadpool,
            __dirname,
        } = Env;
        log.info(`
-----------------
app: ${appName}, version: ${appVersion},
args: "${process.execArgv.join(' ')}",
host: ${hostname}, ${runtime}: ${runtimeVer},
pid: ${process.pid}, workerId: ${workerId || '-'}, threadId: ${threadId || '-'},
euid: ${process.geteuid?.() ?? '-'} egid: ${process.getegid?.() ?? '-'},
NODE_ENV: ${nodeEnv}, uv_threads: ${uvThreadpool}
cwd: ${process.cwd()}, dirname: ${__dirname},
namespace: ${podNamespace || '-'}, pod: ${podName || '-'},
logLevel: ${LogLevel[save]}, isDebugging: ${isDebugging()}, test: ${process.env.NODE_TEST_CONTEXT}
-----------------`);
        log.conf.level = save;
    }

    reload = Env.init;
    print = Env.print;
    get = Env.get;
}

// Create and export singleton instance
export const env = new Env();
