import { ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { DateEx, debounce, sleep, timeLocal } from './time';

describe('sleep', () => {
    test('should delay execution', async () => {
        const start = Date.now();
        await sleep(100);
        const elapsed = Date.now() - start;
        // Allow 10ms tolerance for timing precision issues
        ok(elapsed >= 90, `Expected at least 90ms, got ${elapsed}ms`);
        ok(elapsed < 150, `Expected less than 150ms, got ${elapsed}ms`);
    });
});

describe('DateEx', () => {
    test('should format date/time strings', () => {
        const date = new DateEx('2024-01-15T00:00:00Z');
        ok(typeof date.toDateString() === 'string');
        ok(typeof date.toTimeString() === 'string');
        ok(typeof date.toDateTimeString() === 'string');
    });
    test('should add days and months', () => {
        const date = new DateEx('2024-01-15T00:00:00Z');
        strictEqual(date.addDays(1).getDate(), date.getDate() + 1);
        strictEqual(date.addMonths(1).getMonth(), (date.getMonth() + 1) % 12);
    });
    test('should parse ms duration strings', () => {
        strictEqual(DateEx.ms('1sec'), 1000);
        strictEqual(DateEx.ms('2min'), 120000);
        strictEqual(DateEx.ms('1h'), 3600000);
        strictEqual(DateEx.ms('1d'), 86400000);
    });
    test('should add duration strings', () => {
        const date = new DateEx('2024-01-15T00:00:00Z');
        strictEqual(date.add('1d').getDate(), date.getDate() + 1);
    });
    test('should return relative string', () => {
        const date = new DateEx(Date.now() - 60 * 1000);
        ok(date.toRelativeString().includes('minute'));
    });
});

describe('timeLocal', () => {
    test('should update <time> elements to local string', () => {
        document.body.innerHTML = '<time datetime="2024-01-15T00:00:00Z"></time>';
        timeLocal(document);
        const timeEl = document.querySelector('time');
        ok(timeEl?.textContent && timeEl.textContent !== '');
    });
});

describe('debounce', () => {
    test('should delay function execution', async () => {
        let callCount = 0;
        const fn = () => {
            callCount++;
        };

        const debounced = debounce(fn, 10);

        // Call multiple times rapidly
        debounced();
        debounced();
        debounced();

        // Function should not have been called yet
        strictEqual(callCount, 0);

        // Wait for debounce delay
        await sleep(20);

        // Function should have been called once
        strictEqual(callCount, 1);
    });

    test('should pass arguments to debounced function', async () => {
        let receivedArg: string | undefined;
        const fn = (arg: string) => {
            receivedArg = arg;
        };

        const debounced = debounce(fn, 10);
        debounced('test-value');

        await sleep(20);

        strictEqual(receivedArg, 'test-value');
    });

    test('should use default delay of 300ms when not specified', async () => {
        let callCount = 0;
        const fn = () => {
            callCount++;
        };

        const debounced = debounce(fn); // No delay specified, should use 300ms
        debounced();

        // Should not have been called after 200ms
        await sleep(200);
        strictEqual(callCount, 0);

        // Should have been called after 350ms (300 + buffer)
        await sleep(150);
        strictEqual(callCount, 1);
    });

    test('should cancel previous timeout when called again', async () => {
        let callCount = 0;
        const fn = () => {
            callCount++;
        };

        const debounced = debounce(fn, 30);

        debounced();
        await sleep(20); // Wait less than debounce delay
        debounced(); // This should cancel the first call
        await sleep(20); // Wait less than debounce delay again

        // First call should have been cancelled
        strictEqual(callCount, 0);

        await sleep(40); // Wait for second call to complete (greater than debounce delay)

        // Only the second call should have executed
        strictEqual(callCount, 1);
    });

    test('should handle multiple sequential calls', async () => {
        const calls: number[] = [];
        const fn = (value: number) => {
            calls.push(value);
        };

        const debounced = debounce(fn, 10);

        debounced(1);
        await sleep(20);

        debounced(2);
        await sleep(20);

        debounced(3);
        await sleep(20);

        // Should have three calls with correct values
        strictEqual(calls.length, 3);
        strictEqual(calls[0], 1);
        strictEqual(calls[1], 2);
        strictEqual(calls[2], 3);
    });
});
