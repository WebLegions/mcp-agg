// Prehook: Ensure Bun version < 1.2.22

// NOTE: Testing with node:test on Bun is broken in newer Bun versions.
// See: https://github.com/oven-sh/bun/issues/5090

import { Version } from '../src/shared/utils/version';

if (typeof Bun !== 'undefined' && Bun.version) {
    const bunVer = new Version(Bun.version);
    const minVer = new Version('1.2.22');
    if (bunVer.gt(minVer)) {
        // Optionally, throw or warn here
        console.error('Bun issue #5090 is blocking proper running of node:test with mocks');
        console.error('See: https://github.com/oven-sh/bun/issues/5090');
        throw new Error('Must use Bun v <= 1.2.22');
    }
}

/**
 * Mock utility for Bun tests.
 * This is done to match the mock functionality of Bun with node:test (aka polyfill)
 * It's injected into the test runner from preload hook in bunfig.toml
 * Runs during preload (see bunfig.toml) to augment the built-in mock
 *
 * MockTracker methods:
 * - reset(): Restores all mocks + Disassociates (clears arrays)
 * - restoreAll(): DEPRECATED - disabled to prevent test interference in parallel execution
 *
 * Individual mock context methods:
 * - mockContext.restore(): Restores single mock (on function/method contexts) - USE THIS INSTEAD
 */

import { mock as bunFn } from 'bun:test';
import * as nodeTest from 'node:test';

/** Mock tracker compatible with node:test's MockTracker */
class Tracker {
    private _fns: Array<ReturnType<typeof bunFn>> = [];
    private _methods: Array<{
        obj: Record<string, unknown>;
        name: string;
        orig: unknown;
        mock: (...args: unknown[]) => unknown;
    }> = [];

    fn<T extends (...args: unknown[]) => unknown>(orig?: T): nodeTest.Mock<T> {
        let fn = bunFn(orig || (() => {}));

        // bun:test.mock is incompatible with node:test.Mock
        // `fn.mock.calls.arguments` is missing <<< `calls` is the array holding the arguments
        // `fn.mock.callCount` is missing <<< `calls.length`
        // `fn.mock.restore` is missing <<< `mockClear` is the same

        // Create a Proxy to intercept property access and function calls
        const origMock = fn.mock as ReturnType<typeof bunFn>['mock'];
        fn = new Proxy(fn, {
            get(target, prop, receiver) {
                if (prop === 'mock') {
                    Object(target).__mockPrx ??= new Proxy(origMock, {
                        get(target, prop, receiver) {
                            if (prop === 'calls') {
                                // Add `arguments` property to each call for node:test compatibility
                                origMock.calls.forEach((args: unknown) => {
                                    Object(args).arguments = args;
                                });
                                return origMock.calls;
                            } else if (prop === 'callCount') {
                                // Add callCount() method for node:test compatibility
                                return () => origMock.calls.length;
                            } else if (prop === 'restore') {
                                // Add restore() method on individual mock context (node:test API).
                                // Node.js just resets Iementation to original, which is already in place
                                return () => {
                                    /* no-op for standalone functions */
                                };
                            } else {
                                return Reflect.get(target, prop, receiver);
                            }
                        }, //fn.mock.get
                    });

                    return Object(target).__mockPrx;
                } // fn.mock
                // Return other properties from the original function
                return Reflect.get(target, prop, receiver);
            },
            apply(target, thisArg, args) {
                // You can add call tracking here if needed
                // mockData.calls.push({ arguments: args, ... });
                return Reflect.apply(target, thisArg, args);
            },
        });

        this._fns.push(fn);
        return fn as never;
    }

    method<T extends Record<string, unknown>, K extends keyof T, I extends (...args: unknown[]) => unknown>(
        obj: T,
        name: K,
        I?: I,
    ): nodeTest.Mock<I> {
        const origFn = obj[name];

        if (typeof origFn !== 'function') {
            throw new TypeError(`Cannot mock-method a non-function property "${String(name)}"`);
        }

        const fn = this.fn(I || (origFn as I));
        obj[name] = fn as never;
        this._methods.push({ obj, name: name as string, orig: origFn, mock: fn });

        // Override restore() for mocked methods to restore the original on the object
        // Note: restore() does NOT clear call history (use resetCalls() for that)
        fn.mock.restore = () => {
            obj[name] = origFn;
        };

        return fn;
    }

    reset() {
        // Restores all mocks AND disassociates from tracker (node:test API)
        // This is called automatically after each test completes
        for (const m of this._methods) {
            m.obj[m.name] = m.orig;
        }
        // Clear arrays - disassociate mocks from tracker
        this._methods = [];
        this._fns = [];
    }

    restoreAll() {
        // DEPRECATED: Do not use mock.restoreAll() - it causes test interference when tests run in parallel
        // Each test should restore its own mocks in a finally block using mock.restore()
        // This method is now a no-op to prevent accidental usage
        console.warn('WARNING: mock.restoreAll() is disabled. Use individual mock.restore() in test finally blocks instead.');
    }
}

// Create global instance (not exported - only used internally to extend node:test mock)
const tracker = new Tracker();

if (nodeTest.mock && typeof nodeTest.mock === 'function') {
    Object.assign(nodeTest.mock, {
        method: tracker.method.bind(tracker),
        fn: tracker.fn.bind(tracker),
        reset: tracker.reset.bind(tracker),
        restoreAll: tracker.restoreAll.bind(tracker),
    });
}

// Type augmentation for our extensions to node:test mock
declare module 'node:test' {
    export interface MockTracker {
        method<T extends Record<string, unknown>, K extends keyof T, I extends (...args: unknown[]) => unknown>(
            object: T,
            methodName: K,
            implementation?: I,
        ): Mock<I>;
        fn<T extends (...args: unknown[]) => unknown>(original?: T): Mock<T>;
        reset(): void;
        restoreAll(): void;
    }
}
