/**
 * Tests for Validator-based Form Input Component
 */

import { ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { z } from '../../shared/libs/validator';
import { extractFieldValidators } from './validator-input';

describe('validator-input', () => {
    describe('extractFieldValidators', () => {
        test('extracts field validators from object schema', () => {
            const schema = z.object({
                name: z.string().min(1).max(120),
                email: z.string().email(),
                age: z.number().optional(),
            });

            const validators = extractFieldValidators(schema);

            ok(validators.name, 'name validator exists');
            ok(validators.email, 'email validator exists');
            ok(validators.age, 'age validator exists');

            // Check that validators have correct metadata
            const nameDefs = validators.name.defs();
            strictEqual(nameDefs.minLength, 1);
            strictEqual(nameDefs.maxLength, 120);

            // Email validator has a pattern (regex) for validation
            const emailDefs = validators.email.defs();
            ok(emailDefs.pattern, 'email has pattern validation');

            const _ageDefs = validators.age.defs();
            strictEqual(validators.age.isOptional, true);
        });

        test('extracts validators from MCP server schema', () => {
            const schema = z.object({
                name: z.string().min(1).max(120).describe('Unique server name'),
                command: z.string().min(1).describe('Command to execute'),
                url: z.string().url().describe('Server endpoint URL'),
            });

            const validators = extractFieldValidators(schema);

            ok(validators.name);
            ok(validators.command);
            ok(validators.url);

            // Check descriptions
            const nameDefs = validators.name.defs();
            strictEqual(nameDefs.description, 'Unique server name');

            // URL validator has validation logic (no format field needed)
            const urlDefs = validators.url.defs();
            strictEqual(urlDefs.description, 'Server endpoint URL');
        });

        test('handles optional and default values', () => {
            const schema = z.object({
                required: z.string().min(1),
                optional: z.string().optional(),
                withDefault: z.string().default('default-value'),
            });

            const validators = extractFieldValidators(schema);

            strictEqual(validators.required.isOptional, false);
            strictEqual(validators.optional.isOptional, true);

            const defaultDefs = validators.withDefault.defs();
            strictEqual(defaultDefs.default, 'default-value');
        });

        test('handles number constraints', () => {
            const schema = z.object({
                age: z.number().min(0).max(150),
                count: z.number().int(),
            });

            const validators = extractFieldValidators(schema);

            const ageDefs = validators.age.defs();
            strictEqual(ageDefs.minimum, 0);
            strictEqual(ageDefs.maximum, 150);
        });
    });
});
