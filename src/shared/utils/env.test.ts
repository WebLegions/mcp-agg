import { deepEqual, ok } from 'node:assert/strict';
import * as fs from 'node:fs';
import { resolve } from 'node:path';
import { after, before, describe, mock, test } from 'node:test';
import { Env } from './env';

describe('env', (t) => {
    let save: NodeJS.ProcessEnv;

    before(async () => {
        save = { ...process.env };
        process.env.NODE_ENV = 'test';
        process.env.NODE_TEST_CONTEXT ??= t.name;
        const envFile = resolve(Env.__dirname, '.env.development');
        ok(fs.existsSync(envFile));

        process.env.DOT_ENV_FILE = envFile;
        await Env.init(true); // Force re-initialization
    });

    after(() => {
        process.env = save;
    });

    test('static memebers', () => {
        deepEqual(Env.nodeEnv, 'test');
        deepEqual(Env.runtime, 'bun');
        ok(typeof Env.runtimeVer === 'string');
        ok(parseFloat(Env.runtimeVer) > 0);
        // With happy-dom preloaded for tests, DOM is available
        deepEqual(Env.hasDOM, true);
        deepEqual(Env.isTestMode, true);
    });

    test('cover env defaults', () => {
        // Env is already initialized, just check that vars are set
        ok(typeof process.env.NODE_ENV === 'string');
        ok(typeof process.env.DOT_ENV_FILE === 'string');
        ok(typeof process.env.APP_NAME === 'string');
        ok(typeof process.env.HOSTNAME === 'string');
        ok(typeof process.env.LOG_ADD_TIME === 'string');
        ok(typeof process.env.LOG_LEVEL === 'string');
        ok(typeof process.env.LOG_FORMAT === 'string');
    });

    test('cluster and worker detection', () => {
        // In test environment, we're the primary process
        deepEqual(Env.isPrimary, true);
        // Since we're not a worker, workerId should be empty
        deepEqual(Env.workerId, '');
        // We're on the main thread
        deepEqual(Env.isMainThread, true);
        // Thread ID should be a number
        ok(typeof Env.threadId === 'number');
    });

    test('print info', async (_t) => {
        const fn = mock.method(process.stdout, 'write', (txt: string) => {
            ok(txt.includes('-------'));
        });
        Env.print();
        deepEqual(fn.mock.calls.length, 1);
    });

    test('get Env vars with defaults, min, max', () => {
        process.env.TEST_INT = '123';
        process.env.TEST_STR = 'hello';

        deepEqual(Env.get('TEST_INT', 0), 123);
        deepEqual(Env.get('TEST_INT', 0, 100), 123);
        deepEqual(Env.get('TEST_INT', 0, 200, 400), 200);
        deepEqual(Env.get('NO_EXIST', 42), 42);

        deepEqual(Env.get('TEST_STR', 'def'), 'hello');
        deepEqual(Env.get('TEST_STR', 'def', 'aa', 'zz'), 'hello');
        deepEqual(Env.get('TEST_STR', 'def', 'zz'), 'zz');
        deepEqual(Env.get('TEST_STR', 'def', 'aa', 'bb'), 'bb');
        deepEqual(Env.get('NO_EXIST', 'def'), 'def');
    });

    test('get Env var with object default and JSON parsing', () => {
        // Valid JSON
        process.env.TEST_OBJ = '{"foo":42,"bar":"baz"}';
        const defObj = { foo: 0, bar: '' };
        const result = Env.get('TEST_OBJ', defObj);
        deepEqual(result.foo, 42);
        deepEqual(result.bar, 'baz');

        // Invalid JSON falls back to default
        process.env.TEST_OBJ = 'not-json';
        const result2 = Env.get('TEST_OBJ', defObj);
        deepEqual(result2.foo, 0);
        deepEqual(result2.bar, '');

        // No env var returns default
        delete process.env.TEST_OBJ;
        const result3 = Env.get('TEST_OBJ', defObj);
        deepEqual(result3.foo, 0);
        deepEqual(result3.bar, '');
    });
});
