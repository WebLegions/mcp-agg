import { strictEqual } from 'node:assert/strict';
import { describe, mock, test } from 'node:test';
import { sleep } from '../shared/utils/time';
import { type AtExit, atExit } from './at-exit';

// NB!!!
// Skip these tests in batch mode - they emit SIGINT signals that interfere with test runner
// you can run it manually to test the functionality.
describe.skip('atExit', () => {
    test('remove removes a callback', () => {
        const cb = mock.fn() as never as AtExit;
        const remove = atExit(cb);
        strictEqual(remove(), true);
        strictEqual(remove(), false);
    });

    test('callbacks are called on signal in LIFO order', async () => {
        const cb1 = mock.fn(() => Promise.resolve()); // should be called 2nd
        const cb2 = mock.fn(() => strictEqual(cb1.mock.calls.length, 0)); // should be called 1st
        const exit = mock.method(process, 'exit', () => strictEqual(cb2.mock.calls.length, 1));
        try {
            const remove1 = atExit(cb1);
            const remove2 = atExit(cb2);

            process.emit('SIGINT', 'SIGINT');
            await sleep(1); // wait for callbacks to finish

            strictEqual(cb1.mock.calls.length, 1);
            strictEqual(cb2.mock.calls.length, 1);

            remove2();
            remove1();
        } finally {
            exit.mock.restore();
        }
    });

    test('trigger timeout exit on a long callback', async () => {
        const save = process.env.AT_TERMINATE_TIMEOUT;
        process.env.AT_TERMINATE_TIMEOUT = '2';
        const cb1 = mock.fn(() => sleep(10)); // should trigger the timeout
        const exit = mock.method(process, 'exit', () => {
            // should be called once from signal and once from timeout
            strictEqual(cb1.mock.calls.length, 1);
        });

        const remove1 = atExit(cb1);
        try {
            process.emit('SIGINT', 'SIGINT');
            await sleep(50); // wait for callbacks to finish

            strictEqual(cb1.mock.calls.length, 1);
            strictEqual(exit.mock.calls.length, 2);
        } finally {
            remove1();
            exit.mock.restore();
            process.env.AT_TERMINATE_TIMEOUT = save;
        }
    });
});
