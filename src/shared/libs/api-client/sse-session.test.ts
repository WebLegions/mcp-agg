/**
 * Unit tests for SSESession class in sse-session.ts
 */
import { ok, rejects, strictEqual } from 'node:assert/strict';
import { describe, mock, test } from 'node:test';
import { sleep } from '../../utils/time';
import { SSESession } from './sse-session';

describe.skip('SSESession', () => {
    test('should parse sessionId from endpoint event', async () => {
        // Mock stream with endpoint event
        const text = new TextEncoder().encode('event:endpoint\ndata:/messages?sessionId=abc123\n\n');
        const mockStream = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(text);
                controller.close();
            },
        });

        const dummyRetry = {
            signal: new AbortController().signal,
            nextDelay: () => 1,
            failed: false,
            abort: () => { },
            state: { failures: 0 },
        };

        const session = new SSESession('http://localhost', {}, dummyRetry, mockStream);
        await sleep(10);
        strictEqual(session.sessionId, 'abc123');
        strictEqual(session.endpoint, '/messages?sessionId=abc123');
    });

    test('should emit sse:message event', async () => {
        const text = new TextEncoder().encode('event:message\ndata:{"foo":"bar"}\n\n');
        const mockStream = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(text);
                controller.close();
            },
        });

        const dummyRetry = {
            signal: new AbortController().signal,
            nextDelay: () => 1,
            failed: false,
            abort: () => { },
            state: { failures: 0 },
        };

        const session = new SSESession('http://localhost', {}, dummyRetry, mockStream);
        let eventReceived = false;
        session.addEventListener('sse:message', (e: Event) => {
            if (e instanceof CustomEvent) {
                eventReceived = true;
                strictEqual(e.detail.foo, 'bar');
            }
        });

        await sleep(10);
        ok(eventReceived);
    });

    test('should reconnect on stream end if not closed', async () => {
        let reconnectCalled = false;

        class TestSession extends SSESession {
            protected async _reconnect(): Promise<void> {
                reconnectCalled = true;
            }
        }

        const text = new TextEncoder().encode('event:message\ndata:test\n\n');
        const mockStream = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(text);
                controller.close();
            },
        });

        const dummyRetry = {
            signal: new AbortController().signal,
            nextDelay: () => 1,
            failed: false,
            abort: () => { },
            state: { failures: 0 },
        };

        new TestSession('http://localhost', {}, dummyRetry, mockStream);
        await sleep(20);
        ok(reconnectCalled);
    });

    test('should close session and emit disconnected', async () => {
        const text = new TextEncoder().encode('event:message\ndata:test\n\n');
        const mockStream = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(text);
                controller.close();
            },
        });

        const abortController = new AbortController();
        const dummyRetry = {
            signal: abortController.signal,
            nextDelay: () => 1,
            failed: false,
            abort: (reason?: string) => abortController.abort(reason),
            state: { failures: 0 },
        };

        const session = new SSESession('http://localhost', {}, dummyRetry, mockStream);
        let disconnected = false;
        session.addEventListener('disconnected', () => {
            disconnected = true;
        });

        session.close();
        await sleep(10);
        ok(disconnected);
        ok(session.closed);
    });

    test('should handle multiple SSE events', async () => {
        const text = new TextEncoder().encode(
            'event:endpoint\ndata:/messages?sessionId=xyz\n\n' +
            'event:message\ndata:{"msg":"first"}\n\n' +
            'event:message\ndata:{"msg":"second"}\n\n',
        );
        const mockStream = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(text);
                controller.close();
            },
        });

        const dummyRetry = {
            signal: new AbortController().signal,
            nextDelay: () => 1,
            failed: false,
            abort: () => { },
            state: { failures: 0 },
        };

        const session = new SSESession('http://localhost', {}, dummyRetry, mockStream);
        const messages: unknown[] = [];
        session.addEventListener('sse:message', (e: Event) => {
            if (e instanceof CustomEvent) {
                messages.push(e.detail);
            }
        });

        await sleep(20);
        strictEqual(session.sessionId, 'xyz');
        strictEqual(messages.length, 2);
    });

    test('should handle error events', async () => {
        const text = new TextEncoder().encode('event:error\ndata:{"error":"something went wrong"}\n\n');
        const mockStream = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(text);
                controller.close();
            },
        });

        const dummyRetry = {
            signal: new AbortController().signal,
            nextDelay: () => 1,
            failed: false,
            abort: () => { },
            state: { failures: 0 },
        };

        const session = new SSESession('http://localhost', {}, dummyRetry, mockStream);
        let errorReceived = false;
        session.addEventListener('sse:error', (e: Event) => {
            if (e instanceof CustomEvent) {
                errorReceived = true;
                strictEqual(e.detail.error, 'something went wrong');
            }
        });

        await sleep(10);
        ok(errorReceived);
    });

    test('should handle custom events', async () => {
        const text = new TextEncoder().encode('event:custom\ndata:{"custom":"data"}\n\n');
        const mockStream = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(text);
                controller.close();
            },
        });

        const dummyRetry = {
            signal: new AbortController().signal,
            nextDelay: () => 1,
            failed: false,
            abort: () => { },
            state: { failures: 0 },
        };

        const session = new SSESession('http://localhost', {}, dummyRetry, mockStream);
        let customEventReceived = false;
        session.addEventListener('sse:custom', (e: Event) => {
            if (e instanceof CustomEvent) {
                customEventReceived = true;
                strictEqual(e.detail.custom, 'data');
            }
        });

        await sleep(10);
        ok(customEventReceived);
    });

    test('should handle partial events across chunks', async () => {
        const mockStream = new ReadableStream<Uint8Array>({
            start(controller) {
                // Send incomplete event first
                controller.enqueue(new TextEncoder().encode('event:message\nda'));
                // Then complete it
                controller.enqueue(new TextEncoder().encode('ta:{"test":true}\n\n'));
                controller.close();
            },
        });

        const dummyRetry = {
            signal: new AbortController().signal,
            nextDelay: () => 1,
            failed: false,
            abort: () => { },
            state: { failures: 0 },
        };

        const session = new SSESession('http://localhost', {}, dummyRetry, mockStream);
        let eventReceived = false;
        session.addEventListener('sse:message', (e: Event) => {
            if (e instanceof CustomEvent) {
                eventReceived = true;
                strictEqual(e.detail.test, true);
            }
        });

        await sleep(20);
        ok(eventReceived);
    });

    test('should test endpoint and sessionId getters', async () => {
        const text = new TextEncoder().encode(
            'event:endpoint\ndata:/messages?sessionId=gen123\n\n' + 'event:message\ndata:{"id":1,"msg":"test1"}\n\n',
        );
        const mockStream = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(text);
                setTimeout(() => controller.close(), 50);
            },
        });

        const abortController = new AbortController();
        const dummyRetry = {
            signal: abortController.signal,
            nextDelay: () => 1,
            failed: false,
            abort: (reason?: string) => abortController.abort(reason),
            state: { failures: 0 },
        };

        const session = new SSESession('http://localhost', {}, dummyRetry, mockStream);
        await sleep(30); // Let events be processed

        // Test getters
        strictEqual(session.sessionId, 'gen123');
        ok(session.endpoint);
        ok(session.connected);
        strictEqual(session.reconnecting, false);

        session.close();
    });

    test('should test sendRequest method with endpoint', async () => {
        const text = new TextEncoder().encode('event:endpoint\ndata:/api/test\n\n');
        const mockStream = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(text);
                // Keep stream open
            },
        });

        const abortController = new AbortController();
        const dummyRetry = {
            signal: abortController.signal,
            nextDelay: () => 1,
            failed: false,
            abort: (reason?: string) => abortController.abort(reason),
            state: { failures: 0 },
        };

        const session = new SSESession('http://localhost', {}, dummyRetry, mockStream);
        await sleep(20); // Wait for endpoint to be set

        // Test that endpoint is set
        ok(session.endpoint);
        strictEqual(session.endpoint, '/api/test');

        session.close();
    });

    test('should handle sendRequest when closed', async () => {
        const text = new TextEncoder().encode('event:endpoint\ndata:/api/test\n\n');
        const mockStream = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(text);
                controller.close();
            },
        });

        const abortController = new AbortController();
        const dummyRetry = {
            signal: abortController.signal,
            nextDelay: () => 1,
            failed: false,
            abort: (reason?: string) => abortController.abort(reason),
            state: { failures: 0 },
        };

        const session = new SSESession('http://localhost', {}, dummyRetry, mockStream);
        session.close();

        // sendRequest should throw when session is closed
        await rejects(async () => {
            await session.sendRequest('test.method');
        }, /Session is closed/);
    });

    test('should test connected and reconnecting properties', async () => {
        const text = new TextEncoder().encode('event:message\ndata:{"test":true}\n\n');
        const mockStream = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(text);
                setTimeout(() => controller.close(), 50);
            },
        });

        const dummyRetry = {
            signal: new AbortController().signal,
            nextDelay: () => 1,
            failed: false,
            abort: () => { },
            state: { failures: 0 },
        };

        const session = new SSESession('http://localhost', {}, dummyRetry, mockStream);

        // Initially should be connected (not reconnecting, not closed)
        ok(session.connected);
        strictEqual(session.reconnecting, false);
        strictEqual(session.closed, false);

        await sleep(10);
    });

    test('should handle stream read errors', async () => {
        const errorPromise = new Promise<boolean>((resolve) => {
            const mockStream = new ReadableStream<Uint8Array>({
                start(controller) {
                    // Delay error to allow event listener to be registered
                    setTimeout(() => {
                        controller.error(new Error('Stream error'));
                    }, 50);
                },
            });

            const dummyRetry = {
                signal: new AbortController().signal,
                nextDelay: () => 1,
                failed: false,
                abort: () => { },
                state: { failures: 0 },
            };

            const session = new SSESession('http://localhost', {}, dummyRetry, mockStream);

            session.addEventListener('error', (e: Event) => {
                if (e instanceof CustomEvent) {
                    resolve(true);
                }
            });

            // Timeout in case error never arrives
            setTimeout(() => resolve(false), 200);
        });

        const errorReceived = await errorPromise;
        ok(errorReceived, 'Error event should be received');
    });

    test('should parse sessionId from endpoint URL', async () => {
        const text = new TextEncoder().encode('event:endpoint\ndata:/messages?sessionId=abc123\n\n');
        const mockStream = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(text);
                controller.close();
            },
        });

        const dummyRetry = {
            signal: new AbortController().signal,
            nextDelay: () => 1,
            failed: false,
            abort: () => { },
            state: { failures: 0 },
        };

        const session = new SSESession('http://localhost', {}, dummyRetry, mockStream);
        await sleep(10);

        strictEqual(session.sessionId, 'abc123');
        strictEqual(session.endpoint, '/messages?sessionId=abc123');
    });

    test('should trigger session-changed event when sessionId changes', async () => {
        const text = new TextEncoder().encode('event:endpoint\ndata:/messages\n\n');
        const mockStream = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(text);
                controller.close();
            },
        });

        const dummyRetry = {
            signal: new AbortController().signal,
            nextDelay: () => 1,
            failed: false,
            abort: () => { },
            state: { failures: 0 },
        };

        const session = new SSESession('http://localhost', {}, dummyRetry, mockStream);
        let sessionChanged = false;
        let oldId: string | undefined;
        let newId: string | undefined;

        session.addEventListener('session-changed', (e: Event) => {
            if (e instanceof CustomEvent) {
                sessionChanged = true;
                oldId = e.detail.oldId;
                newId = e.detail.newId;
            }
        });

        await sleep(10);
        session.sessionId = 'new-session-123';
        await sleep(5);

        ok(sessionChanged);
        strictEqual(oldId, undefined);
        strictEqual(newId, 'new-session-123');
        strictEqual(session.sessionId, 'new-session-123');
    });

    test('should handle sendRequest error without endpoint', async () => {
        const mockStream = new ReadableStream<Uint8Array>({
            start(controller) {
                // Don't send endpoint event
                controller.close();
            },
        });

        const abortController = new AbortController();
        const dummyRetry = {
            signal: abortController.signal,
            nextDelay: () => 1,
            failed: false,
            abort: (reason?: string) => abortController.abort(reason),
            state: { failures: 0 },
        };

        const session = new SSESession('http://localhost', {}, dummyRetry, mockStream);
        await sleep(20);

        await rejects(async () => {
            await session.sendRequest('test.method');
        }, /Not connected - no endpoint URL/);

        session.close();
    });

    test('should handle sendRequest with successful HTTP response (non-202)', async () => {
        const text = new TextEncoder().encode('event:endpoint\ndata:/messages\n\n');
        const mockStream = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(text);
                // Keep stream open
            },
        });

        const abortController = new AbortController();
        const dummyRetry = {
            signal: abortController.signal,
            nextDelay: () => 1,
            failed: false,
            abort: (reason?: string) => abortController.abort(reason),
            state: { failures: 0 },
        };

        const mockFetch = mock.method(globalThis, 'fetch', async () => {
            return new Response(JSON.stringify({ success: true }), {
                status: 200,
            });
        });

        try {
            const session = new SSESession('http://localhost', {}, dummyRetry, mockStream);
            await sleep(20);

            const result = await session.sendRequest<{ success: boolean }>('test.method');
            ok(result);
            strictEqual(result.success, true);
            ok(mockFetch.mock.calls.length > 0);

            session.close();
        } finally {
            mockFetch.mock.restore();
        }
    });

    test('should handle sendRequest with HTTP error status', async () => {
        const text = new TextEncoder().encode('event:endpoint\ndata:/messages\n\n');
        const mockStream = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(text);
                // Keep stream open
            },
        });

        const abortController = new AbortController();
        const dummyRetry = {
            signal: abortController.signal,
            nextDelay: () => 1,
            failed: false,
            abort: (reason?: string) => abortController.abort(reason),
            state: { failures: 0 },
        };

        const mockFetch = mock.method(globalThis, 'fetch', async () => {
            return new Response('Server Error', { status: 500, statusText: 'Internal Server Error' });
        });
        try {
            const session = new SSESession('http://localhost', {}, dummyRetry, mockStream);
            await sleep(20);

            await rejects(async () => {
                await session.sendRequest('test.method');
            }, /HTTP 500/);

            ok(mockFetch.mock.calls.length > 0);
            session.close();
        } finally {
            mockFetch.mock.restore();
        }
    });
});