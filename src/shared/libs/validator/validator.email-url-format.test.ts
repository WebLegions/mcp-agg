/**
 * Test to verify if email() and url() validators set format in defs
 * This is a bug investigation test
 */

import { strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { email, string, url } from './validator';

describe('Validator format field bug investigation', () => {
    test('email() validator should set format field in defs', () => {
        const validEmail = email();
        const defs = validEmail.defs();

        console.log('email() defs:', JSON.stringify(defs, null, 2));

        // Expected: format should be 'email'
        // Actual: format is undefined (BUG)
        strictEqual(defs.format, 'email', 'email() should set format to "email"');
    });

    test('url() validator should set format field in defs', () => {
        const validUrl = url();
        const defs = validUrl.defs();

        console.log('url() defs:', JSON.stringify(defs, null, 2));

        // JSON Schema standard uses 'uri' format
        strictEqual(defs.format, 'uri', 'url() should set format to "uri"');
    });

    test('string().email() should set format field in defs', () => {
        const validStrEmail = string().email();
        const defs = validStrEmail.defs();

        console.log('string().email() defs:', JSON.stringify(defs, null, 2));

        // Expected: format should be 'email'
        // Actual: format is undefined (BUG)
        strictEqual(defs.format, 'email', 'string().email() should set format to "email"');
    });

    test('string().url() should set format field in defs', () => {
        const validStrUrl = string().url();
        const defs = validStrUrl.defs();

        console.log('string().url() defs:', JSON.stringify(defs, null, 2));

        // JSON Schema standard uses 'uri' format
        strictEqual(defs.format, 'uri', 'string().url() should set format to "uri"');
    });

    test('email() validator does set pattern from regex', () => {
        const validEmail2 = email();
        const defs = validEmail2.defs();

        console.log('email() pattern:', defs.pattern);

        // Email uses regex() which sets pattern
        strictEqual(typeof defs.pattern, 'string', 'email() should set pattern');
    });
});
