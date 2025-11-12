/// <reference lib="dom" />
import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { getStorageItem, removeStorageItem, setStorageItem } from './storage';

describe('Shared Utilities', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    test('getStorageItem should retrieve value from localStorage', () => {
        localStorage.setItem('test-key', 'test-value');
        const result = getStorageItem('test-key');
        assert.equal(result, 'test-value');
    });

    test('getStorageItem should return default value when key not found', () => {
        const result = getStorageItem('nonexistent', 'default-value');
        assert.equal(result, 'default-value');
    });

    test('getStorageItem should return undefined when key not found and no default', () => {
        const result = getStorageItem('nonexistent');
        assert.equal(result, undefined);
    });

    test('setStorageItem should store value in localStorage', () => {
        setStorageItem('test-key', 'test-value');
        const stored = localStorage.getItem('test-key');
        assert.equal(stored, 'test-value');
    });

    test('setStorageItem should overwrite existing value', () => {
        localStorage.setItem('test-key', 'old-value');
        setStorageItem('test-key', 'new-value');
        const stored = localStorage.getItem('test-key');
        assert.equal(stored, 'new-value');
    });

    test('removeStorageItem should remove value from localStorage', () => {
        localStorage.setItem('test-key', 'test-value');
        removeStorageItem('test-key');
        const stored = localStorage.getItem('test-key');
        assert.equal(stored, null);
    });

    test('removeStorageItem should handle nonexistent keys', () => {
        removeStorageItem('nonexistent');
        assert.ok(true);
    });
});
