import { ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createPagination, enableTableSort, PAGINATION_TEMPLATE_ID } from './table';

describe('table pagination', () => {
    test('createPagination returns undefined for single page', () => {
        strictEqual(createPagination('/page/', 0, 10, 10), undefined);
    });

    test('createPagination returns HTMLElement for multiple pages', () => {
        // Setup DOM
        document.body.innerHTML = '';
        const el = createPagination('/page/', 0, 5, 20);
        ok(el instanceof HTMLElement);
        ok(document.getElementById(PAGINATION_TEMPLATE_ID) instanceof HTMLElement);
    });

    test('enableTableSort does not throw on empty table', () => {
        const table = document.createElement('table');
        try {
            enableTableSort(table);
        } catch {
            ok(false, 'enableTableSort should not throw');
        }
    });

    // Add more tests for sorting logic and DOM integration as needed
});
