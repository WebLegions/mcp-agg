/**
 * Tests for examples() method
 */

import { deepStrictEqual, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { string } from './validator';

describe('Validator examples() method', () => {
    test('sets examples using examples() method', () => {
        const v = string().examples('foo', 'bar', 'baz');
        const defs = v.defs();

        deepStrictEqual(defs.examples, ['foo', 'bar', 'baz']);
    });

    test('examples() is chainable', () => {
        const v = string().min(3).examples('hello', 'world').max(10).describe('A greeting');

        const defs = v.defs();

        strictEqual(defs.minLength, 3);
        strictEqual(defs.maxLength, 10);
        strictEqual(defs.description, 'A greeting');
        deepStrictEqual(defs.examples, ['hello', 'world']);
    });

    test('examples() works with email v', () => {
        const v = string().email().examples('admin@example.com', 'user@test.org');
        const defs = v.defs();

        strictEqual(defs.format, 'email');
        strictEqual(defs.pattern, '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$');
        deepStrictEqual(defs.examples, ['admin@example.com', 'user@test.org']);
    });

    test('examples() overrides previous examples', () => {
        const v = string().examples('old1', 'old2').examples('new1', 'new2');

        const defs = v.defs();
        deepStrictEqual(defs.examples, ['new1', 'new2']);
    });

    test('can use single example', () => {
        const v = string().examples('single-example');
        const defs = v.defs();

        deepStrictEqual(defs.examples, ['single-example']);
    });

    test('built-in validators have examples set automatically', () => {
        const email = string().email();
        const url = string().url();
        const uuid = string().uuid();

        strictEqual(email.defs().examples?.[0], 'user@example.com');
        strictEqual(url.defs().examples?.[0], 'https://example.com');
        strictEqual(uuid.defs().examples?.[0], '123e4567-e89b-12d3-a456-426614174000');
    });

    test('custom examples override built-in examples', () => {
        const v = string()
            .email() // Sets examples: ['user@example.com']
            .examples('custom@example.org'); // Overrides

        const defs = v.defs();
        deepStrictEqual(defs.examples, ['custom@example.org']);
    });
});
