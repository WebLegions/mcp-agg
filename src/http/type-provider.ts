/**
 * Fastify Type Provider for Validator
 * Provides type-safe request/response validation using our custom validator
 */

import type { FastifySchemaCompiler, FastifySerializerCompiler, FastifyTypeProvider } from 'fastify';
import type { Infer, Validator } from '../shared/libs/validator';
import { object } from '../shared/libs/validator';
import { replacerFn } from '../utils/immutable';

// Re-export Infer for convenience
export type { Infer };

/**
 * Validator type provider for Fastify
 * Maps validator schemas to TypeScript types
 */
export interface Provider extends FastifyTypeProvider {
    validator: this['schema'] extends Validator<infer T> ? T : unknown;
    serializer: this['schema'] extends Validator<infer T> ? T : unknown;
}

/**
 * Check if a value is a Validator instance
 */
function isValidator<T = unknown>(schema: Validator<T> | Record<string, Validator>): schema is Validator<T> {
    return (
        typeof schema === 'object' &&
        schema !== null &&
        '_checks' in schema &&
        typeof (schema as Validator<T>).parse === 'function'
    );
}

/**
 * Validator schema compiler for Fastify
 * Compiles validator schemas into validation functions
 *
 * Accepts either:
 * - A Validator instance (e.g., string(), number(), object({ ... }))
 * - A plain object with Validator properties (e.g., { name: string(), age: number() })
 *
 * Plain objects are automatically wrapped with object() before validation.
 */
export const schemaCompiler: FastifySchemaCompiler<Validator | Record<string, Validator>> = ({ schema, httpPart: _httpPart }) => {
    return (data: unknown) => {
        try {
            // If it's already a Validator, use it directly
            if (isValidator(schema)) {
                const result: unknown = schema.parse(data);
                return { value: result };
            }

            // Otherwise, it's a plain object with validators - wrap it
            const validator = object(schema);
            const result: unknown = validator.parse(data);
            return { value: result };
        } catch (error) {
            return { error: error as Error };
        }
    };
};

/**
 * Serializer compiler for Fastify responses
 * Uses Bun's fast JSON.stringify with custom replacer for BigInt support
 */
export const serializerCompiler: FastifySerializerCompiler<Validator | Record<string, Validator>> = () => {
    return (data: unknown): string => JSON.stringify(data, replacerFn, 0);
};
