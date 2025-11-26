import { beforeEach, describe, expect, jest, test } from 'bun:test';
import type { j } from '../main';
import { ConfigClient } from './config-client';

// Mock types
type MockContext = {
    setState: ReturnType<typeof jest.fn>;
    getState: ReturnType<typeof jest.fn>;
    api: {
        fetch: ReturnType<typeof jest.fn>;
    };
};

describe('ConfigClient', () => {
    let service: ConfigClient;
    let mockCtx: MockContext;

    beforeEach(() => {
        mockCtx = {
            setState: jest.fn(),
            getState: jest.fn(),
            api: {
                fetch: jest.fn(),
            },
        };
        service = new ConfigClient(mockCtx as unknown as j.Context);
    });

    test('find - load all servers success', async () => {
        const mockServers = [{ name: 'test', transport: 'stdio', command: 'cmd' }];
        mockCtx.api.fetch.mockResolvedValue({ servers: mockServers });

        await service.find();

        expect(mockCtx.setState).toHaveBeenCalledWith('servers.loading', true);
        expect(mockCtx.setState).toHaveBeenCalledWith('servers.error', '');
        expect(mockCtx.api.fetch).toHaveBeenCalledWith('config');
        expect(mockCtx.setState).toHaveBeenCalledWith('servers.items', mockServers);
        expect(mockCtx.setState).toHaveBeenCalledWith('servers.loading', false);
    });

    test('find - load servers failure', async () => {
        const error = new Error('Fetch failed');
        mockCtx.api.fetch.mockRejectedValue(error);

        await service.find();

        expect(mockCtx.setState).toHaveBeenCalledWith('servers.loading', true);
        expect(mockCtx.setState).toHaveBeenCalledWith('servers.error', error.message);
        expect(mockCtx.setState).toHaveBeenCalledWith('servers.loading', false);
    });

    test('update - direct update with partial config', async () => {
        mockCtx.api.fetch.mockResolvedValue({});
        // Mock find call inside update
        const findSpy = jest.spyOn(service, 'find').mockResolvedValue();

        await service.update('test-server', { enabled: false });

        expect(mockCtx.api.fetch).toHaveBeenCalledWith('config/test-server/enabled', {
            method: 'PATCH',
            body: JSON.stringify({ enabled: false }),
        });
        expect(findSpy).toHaveBeenCalled();
    });

    test('delete - success', async () => {
        // Mock confirm
        global.confirm = () => true;
        mockCtx.api.fetch.mockResolvedValue({});
        const findSpy = jest.spyOn(service, 'find').mockResolvedValue();

        await service.delete('test-server');

        expect(mockCtx.api.fetch).toHaveBeenCalledWith('config/test-server', {
            method: 'DELETE',
        });
        expect(findSpy).toHaveBeenCalled();
    });

    test('create - stdio transport', async () => {
        mockCtx.getState.mockImplementation((key: string, defaultValue?: unknown) => {
            const values: Record<string, unknown> = {
                'serverModal.name.value': 'test-server',
                'serverModal.transport.value': 'stdio',
                'serverModal.command.value': 'node',
                'serverModal.args.value': 'server.js --port 3000',
                'serverModal.description.value': 'Test server',
                'serverModal.enabled.value': true,
            };
            return values[key] ?? defaultValue;
        });

        mockCtx.api.fetch.mockResolvedValue({});
        const findSpy = jest.spyOn(service, 'find').mockResolvedValue();

        await service.create();

        expect(mockCtx.api.fetch).toHaveBeenCalledTimes(1);
        const fetchCall = mockCtx.api.fetch.mock.calls[0];
        expect(fetchCall[0]).toBe('config');
        expect(fetchCall[1].method).toBe('POST');
        const bodyData = JSON.parse(fetchCall[1].body);
        expect(bodyData).toEqual({
            name: 'test-server',
            transport: 'stdio',
            command: 'node',
            args: ['server.js', '--port', '3000'],
            description: 'Test server',
            enabled: true,
        });
        expect(mockCtx.setState).toHaveBeenCalledWith('ui.showServerModal', false);
        expect(findSpy).toHaveBeenCalled();
    });

    test('update - modal-based update with stdio transport', async () => {
        mockCtx.getState.mockImplementation((key: string, defaultValue?: unknown) => {
            const values: Record<string, unknown> = {
                'serverModal.name.value': 'existing-server',
                'serverModal.transport.value': 'stdio',
                'serverModal.command.value': 'bun',
                'serverModal.args.value': '',
                'serverModal.description.value': '',
                'serverModal.enabled.value': false,
            };
            return values[key] ?? defaultValue;
        });

        mockCtx.api.fetch.mockResolvedValue({});
        const findSpy = jest.spyOn(service, 'find').mockResolvedValue();

        await service.update();

        expect(mockCtx.api.fetch).toHaveBeenCalledTimes(1);
        const fetchCall = mockCtx.api.fetch.mock.calls[0];
        expect(fetchCall[0]).toBe('config/existing-server');
        expect(fetchCall[1].method).toBe('PATCH');
        const bodyData = JSON.parse(fetchCall[1].body);
        expect(bodyData).toEqual({
            name: 'existing-server',
            transport: 'stdio',
            command: 'bun',
            enabled: false,
        });
        expect(mockCtx.setState).toHaveBeenCalledWith('ui.showServerModal', false);
        expect(findSpy).toHaveBeenCalled();
    });

    test('create - sse transport', async () => {
        mockCtx.getState.mockImplementation((key: string, defaultValue?: unknown) => {
            const values: Record<string, unknown> = {
                'serverModal.name.value': 'sse-server',
                'serverModal.transport.value': 'sse',
                'serverModal.url.value': 'https://example.com/sse',
                'serverModal.description.value': 'SSE server',
                'serverModal.enabled.value': true,
            };
            return values[key] ?? defaultValue;
        });

        mockCtx.api.fetch.mockResolvedValue({});
        const findSpy = jest.spyOn(service, 'find').mockResolvedValue();

        await service.create();

        expect(mockCtx.api.fetch).toHaveBeenCalledTimes(1);
        const fetchCall = mockCtx.api.fetch.mock.calls[0];
        expect(fetchCall[0]).toBe('config');
        expect(fetchCall[1].method).toBe('POST');
        const bodyData = JSON.parse(fetchCall[1].body);
        expect(bodyData).toEqual({
            name: 'sse-server',
            transport: 'sse',
            url: 'https://example.com/sse',
            description: 'SSE server',
            enabled: true,
        });
        expect(mockCtx.setState).toHaveBeenCalledWith('ui.showServerModal', false);
        expect(findSpy).toHaveBeenCalled();
    });

    test('create - validation failure', async () => {
        mockCtx.getState.mockImplementation((key: string, defaultValue?: unknown) => {
            const values: Record<string, unknown> = {
                'serverModal.name.value': '', // Invalid: empty name
                'serverModal.transport.value': 'stdio',
                'serverModal.command.value': 'node',
            };
            return values[key] ?? defaultValue;
        });

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await service.create();

        expect(consoleSpy).toHaveBeenCalled();
        expect(mockCtx.api.fetch).not.toHaveBeenCalled();
        expect(mockCtx.setState).not.toHaveBeenCalledWith('ui.showServerModal', false);

        consoleSpy.mockRestore();
    });

    test('create - API error', async () => {
        mockCtx.getState.mockImplementation((key: string, defaultValue?: unknown) => {
            const values: Record<string, unknown> = {
                'serverModal.name.value': 'test-server',
                'serverModal.transport.value': 'stdio',
                'serverModal.command.value': 'node',
                'serverModal.enabled.value': true,
            };
            return values[key] ?? defaultValue;
        });

        const error = new Error('API failed');
        mockCtx.api.fetch.mockRejectedValue(error);
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await service.create();

        expect(consoleSpy).toHaveBeenCalledWith('Failed to create server:', error);
        expect(mockCtx.setState).not.toHaveBeenCalledWith('ui.showServerModal', false);

        consoleSpy.mockRestore();
    });

    test('headless static method returns service wrapped in api', () => {
        const headlessComponent = ConfigClient.headless({}, mockCtx as unknown as j.Context);

        expect(headlessComponent).toHaveProperty('api');
        expect(headlessComponent.api).toBeInstanceOf(ConfigClient);
    });
});
