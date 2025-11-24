import { beforeEach, describe, expect, jest, test } from 'bun:test';
import type { AppContext } from '../main';
import { ConfigService } from './config-service';

// Mock types
type MockContext = {
    setState: ReturnType<typeof jest.fn>;
    getState: ReturnType<typeof jest.fn>;
    api: {
        fetch: ReturnType<typeof jest.fn>;
    };
};

describe('ConfigService', () => {
    let service: ConfigService;
    let mockCtx: MockContext;

    beforeEach(() => {
        mockCtx = {
            setState: jest.fn(),
            getState: jest.fn(),
            api: {
                fetch: jest.fn(),
            },
        };
        service = new ConfigService(mockCtx as unknown as AppContext);
    });

    test('loadServers success', async () => {
        const mockServers = [{ name: 'test', transport: 'stdio', command: 'cmd' }];
        mockCtx.api.fetch.mockResolvedValue({ servers: mockServers });

        await service.loadServers();

        expect(mockCtx.setState).toHaveBeenCalledWith('servers.loading', true);
        expect(mockCtx.setState).toHaveBeenCalledWith('servers.error', '');
        expect(mockCtx.api.fetch).toHaveBeenCalledWith('config');
        expect(mockCtx.setState).toHaveBeenCalledWith('servers.items', mockServers);
        expect(mockCtx.setState).toHaveBeenCalledWith('servers.loading', false);
    });

    test('loadServers failure', async () => {
        const error = new Error('Fetch failed');
        mockCtx.api.fetch.mockRejectedValue(error);

        await service.loadServers();

        expect(mockCtx.setState).toHaveBeenCalledWith('servers.loading', true);
        expect(mockCtx.setState).toHaveBeenCalledWith('servers.error', error.message);
        expect(mockCtx.setState).toHaveBeenCalledWith('servers.loading', false);
    });

    test('enableServer success', async () => {
        mockCtx.api.fetch.mockResolvedValue({});
        // Mock loadServers call inside enableServer
        const loadSpy = jest.spyOn(service, 'loadServers').mockResolvedValue();

        await service.enableServer('test-server', true);

        expect(mockCtx.api.fetch).toHaveBeenCalledWith('config/test-server/enabled', {
            method: 'PATCH',
            body: JSON.stringify({ enabled: false }),
        });
        expect(loadSpy).toHaveBeenCalled();
    });

    test('deleteServer success', async () => {
        // Mock confirm
        global.confirm = () => true;
        mockCtx.api.fetch.mockResolvedValue({});
        const loadSpy = jest.spyOn(service, 'loadServers').mockResolvedValue();

        await service.deleteServer('test-server');

        expect(mockCtx.api.fetch).toHaveBeenCalledWith('config/test-server', {
            method: 'DELETE',
        });
        expect(loadSpy).toHaveBeenCalled();
    });

    test('headless static method returns service wrapped in api', () => {
        const headlessComponent = ConfigService.headless({}, mockCtx as unknown as AppContext);

        expect(headlessComponent).toHaveProperty('api');
        expect(headlessComponent.api).toBeInstanceOf(ConfigService);
    });
});
