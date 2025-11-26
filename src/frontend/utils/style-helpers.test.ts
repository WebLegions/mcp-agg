import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { j } from '../main';
import { mergeStyles } from './style-helpers';

describe('Style Helpers', () => {
    describe('mergeStyles', () => {
        test('should merge two style objects', () => {
            const style1 = { color: 'red', fontSize: '14px' };
            const style2 = { backgroundColor: 'blue' };

            const result = mergeStyles(style1, style2);

            assert.equal(result.color, 'red');
            assert.equal(result.fontSize, '14px');
            assert.equal(result.backgroundColor, 'blue');
        });

        test('should override properties from earlier objects', () => {
            const style1 = { color: 'red', fontSize: '14px' };
            const style2 = { color: 'blue' };

            const result = mergeStyles(style1, style2);

            assert.equal(result.color, 'blue');
            assert.equal(result.fontSize, '14px');
        });

        test('should handle empty objects', () => {
            const style1 = { color: 'red' };
            const style2 = {};

            const result = mergeStyles(style1, style2);

            assert.equal(result.color, 'red');
        });

        test('should merge multiple objects', () => {
            const style1 = { color: 'red' };
            const style2 = { fontSize: '14px' };
            const style3 = { backgroundColor: 'blue' };

            const result = mergeStyles(style1, style2, style3);

            assert.equal(result.color, 'red');
            assert.equal(result.fontSize, '14px');
            assert.equal(result.backgroundColor, 'blue');
        });

        test('should handle nested style objects', () => {
            const style1 = {
                color: 'red',
                ':hover': {
                    color: 'blue',
                },
            } as j.Style;
            const style2 = {
                fontSize: '14px',
            } as j.Style;

            const result = mergeStyles(style1, style2);

            assert.equal(result.color, 'red');
            assert.equal(result.fontSize, '14px');
            assert.ok(result[':hover']);
        });
    });
});
