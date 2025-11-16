import { readFile, stat } from 'node:fs/promises';
import { join, matchesGlob, normalize, resolve } from 'node:path';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Env } from '../shared/utils/env';
import type { WithParams, WithQuerystring } from './route-types';

type FileType = 'ts' | 'js' | 'cjs' | 'mjs' | 'css' | 'json';

/**
 * In-memory cache for transpiled files
 */
interface CacheEntry {
    content: string;
    mtime: number;
    minified: boolean;
    mimeType: string;
}

const cache = new Map<string, CacheEntry>();

/**
 * Test file glob patterns to exclude from serving
 */
const TEST_FILE_GLOBS = ['**/*.{test,spec}.*', '**/{test,spec}/**', '**/__mock__/**'];

/**
 * Check if file path matches test file patterns using glob
 */
function isTestFile(filePath: string): boolean {
    return TEST_FILE_GLOBS.some((pattern) => matchesGlob(filePath, pattern));
}

/**
 * Detect file type and MIME type from filename
 * Returns [fileType, mimeType] tuple
 */
function getFileTypeAndMime(filename: string): [FileType | undefined, string] {
    const ext = filename.split('.').pop()?.toLowerCase();

    switch (ext) {
        case 'ts':
        case 'js':
        case 'cjs':
        case 'mjs':
            return [ext, 'application/javascript; charset=utf-8'];
        case 'css':
            return [ext, 'text/css; charset=utf-8'];
        case 'json':
            return [ext, 'application/json; charset=utf-8'];
        default:
            return [undefined, ''];
    }
}

/**
 * Add .ts extension to relative imports in JavaScript code
 * Transforms: from './foo' or from "../../bar" → from "./foo.ts" or from "../../bar.ts"
 * Handles directory imports: from '../libs/validator' → from '../libs/validator/index.ts'
 */
async function addTsExtensions(code: string, filePath: string): Promise<string> {
    const fileDir = resolve(filePath, '..');
    const importRegex = /(from\s+["'])(\.\.?[/\\][^"']+?)(["'])/g;

    // Collect all matches first
    const matches: Array<{ match: string; prefix: string; path: string; suffix: string; index: number }> = [];
    let match: RegExpExecArray | null;

    while ((match = importRegex.exec(code)) !== null) {
        matches.push({
            match: match[0],
            prefix: match[1],
            path: match[2],
            suffix: match[3],
            index: match.index,
        });
    }

    // Process matches in reverse to maintain correct indices
    let result = code;
    for (let i = matches.length - 1; i >= 0; i--) {
        const { match, prefix, path, suffix, index } = matches[i];

        // Already has extension, skip
        if (path.endsWith('.ts') || /\.[a-zA-Z0-9]+$/.test(path)) {
            continue;
        }

        // Try to resolve the path to check if it's a directory
        let replacement: string;
        try {
            const resolvedPath = resolve(fileDir, path);
            const stats = await stat(resolvedPath);

            if (stats.isDirectory()) {
                // Directory import - add /index.ts
                replacement = `${prefix}${path}/index.ts${suffix}`;
            } else {
                // Regular file - add .ts
                replacement = `${prefix}${path}.ts${suffix}`;
            }
        } catch {
            // Path doesn't exist or can't be resolved - assume it's a file
            replacement = `${prefix}${path}.ts${suffix}`;
        }

        // Replace in result
        result = result.substring(0, index) + replacement + result.substring(index + match.length);
    }

    return result;
}

/**
 * Process file: read, transpile/minify if needed, and cache
 * Returns [content, mimeType] tuple
 */
async function processFile(filePath: string, minify: boolean): Promise<[string, string]> {
    const fileStats = await stat(filePath);
    const mtime = fileStats.mtimeMs;
    const cacheKey = `${filePath}:${minify}`;

    const cached = cache.get(cacheKey);
    if (cached && cached.mtime === mtime && cached.minified === minify) {
        return [cached.content, cached.mimeType];
    }

    const [fileType, mimeType] = getFileTypeAndMime(filePath.split('/').pop() || '');

    const code = await readFile(filePath, 'utf-8');
    let content: string;

    // TypeScript transpilation
    if (fileType === 'ts') {
        const transpiler = new Bun.Transpiler({
            loader: 'ts',
            target: 'browser',
            minifyWhitespace: minify,
        });
        content = await transpiler.transform(code);
        // Add .ts extensions to relative imports for browser ES modules
        content = await addTsExtensions(content, filePath);
    }
    // JavaScript minification
    else if ((fileType === 'js' || fileType === 'cjs' || fileType === 'mjs') && minify) {
        const transpiler = new Bun.Transpiler({
            loader: 'js',
            target: 'browser',
            minifyWhitespace: true,
        });
        content = await transpiler.transform(code);
    }
    // CSS minification
    else if (fileType === 'css' && minify) {
        content = code
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\s+/g, ' ')
            .replace(/\s*([{}:;,])\s*/g, '$1')
            .trim();
    }
    // JSON minification
    else if (fileType === 'json' && minify) {
        content = JSON.stringify(JSON.parse(code));
    }
    // No processing needed
    else {
        content = code;
    }

    cache.set(cacheKey, { content, mtime, minified: minify, mimeType });
    return [content, mimeType || ''];
}

type FileServe = WithParams<{ '*': string }> & WithQuerystring<{ minify?: string }>;

/**
 * Register transpile route for serving TypeScript and other frontend files
 * @param app - Fastify instance
 * @param localPath - Local filesystem path to serve files from
 * @param remotePath - Remote URL path to serve files at
 */
export function registerTranspile(app: FastifyInstance, localPath: string, remotePath: string): void {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const cacheMaxAge = Env.get('TRANSPILE_CACHE_MAX_AGE', 3600);
    const normalizedLocalPath = resolve(localPath);

    app.get<FileServe>(
        `${remotePath}/*`,
        {
            schema: {
                hide: true, // Exclude from Swagger documentation
            },
        },
        async (req: FastifyRequest<FileServe>, reply: FastifyReply) => {
            const filename = req.params['*'];
            const { minify: minifyParam } = req.query;

            try {
                // Build and normalize the full path
                const requestedPath = resolve(normalize(join(localPath, filename)));

                // Security: ensure the resolved path is within the allowed directory
                if (!requestedPath.startsWith(normalizedLocalPath)) {
                    return reply.code(404).send({ error: 'File not found' });
                }

                // Security: prevent serving test files
                if (isTestFile(requestedPath)) {
                    return reply.code(403).send({ error: 'Access denied' });
                }

                // Determine if should minify: query param overrides NODE_ENV
                const shouldMinify = minifyParam !== undefined ? minifyParam === 'true' : !isDevelopment;

                // Get file content (transpiled/minified as needed) with MIME type
                const [content, mimeType] = await processFile(requestedPath, shouldMinify);

                return reply
                    .code(200)
                    .header('Content-Type', mimeType)
                    .header('Cache-Control', `public, max-age=${cacheMaxAge}`)
                    .send(content);
            } catch (err) {
                if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
                    return reply.code(404).send({ error: 'File not found' });
                }
                console.error('Error serving file:', err);
                return reply.code(500).send({ error: 'Internal server error' });
            }
        },
    );

    console.log(`Transpile route registered: ${remotePath}/* -> ${normalizedLocalPath}`);
}
