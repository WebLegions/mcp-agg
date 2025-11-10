import type { FastifyInstance } from 'fastify';
import { getCluster } from '../cluster';
import { z } from '../lib/validator';

/**
 * Response schema for health endpoint
 */
const healthResponseSchema = z.object({
    status: z.string().describe('Health status'),
    timestamp: z.string().describe('Current server timestamp in ISO 8601 format'),
    workers: z.number().optional().describe('Number of active worker processes (only in cluster mode)'),
});

/**
 * Register health check endpoint
 * Returns status, timestamp, and worker count (if in cluster mode)
 */
export function registerHealth(app: FastifyInstance) {
    app.get(
        '/health',
        {
            schema: {
                summary: 'Health check endpoint',
                description: 'Returns server health status and timestamp',
                tags: ['Monitoring'],
                response: {
                    200: healthResponseSchema,
                },
            },
        },
        async () => {
            const workers = getCluster()?.getStats().activeWorkers ?? 0;
            return {
                status: 'ok',
                timestamp: new Date().toISOString(),
                ...(workers !== undefined && { workers }),
            };
        },
    );
}
