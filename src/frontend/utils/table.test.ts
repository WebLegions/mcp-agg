import { ok, strictEqual } from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { createPagination, enableTableSort, PAGINATION_MAX_VISIBLE, PAGINATION_TEMPLATE_ID } from './table';

describe('table pagination', () => {
    beforeEach(() => {
        // Clean up DOM before each test
        document.body.innerHTML = '';
    });

    test('createPagination returns undefined for single page', () => {
        strictEqual(createPagination('/page/', 0, 10, 10), undefined);
    });

    test('createPagination returns undefined when exactly at page boundary', () => {
        strictEqual(createPagination('/page/', 0, 10, 5), undefined);
    });

    test('createPagination returns HTMLElement for multiple pages', () => {
        const el = createPagination('/page/', 0, 5, 20);
        ok(el instanceof HTMLElement);
        ok(document.getElementById(PAGINATION_TEMPLATE_ID) instanceof HTMLElement);
    });

    test('createPagination creates template only once', () => {
        createPagination('/page/', 0, 5, 20);
        const template1 = document.getElementById(PAGINATION_TEMPLATE_ID);
        createPagination('/page/', 0, 5, 20);
        const template2 = document.getElementById(PAGINATION_TEMPLATE_ID);
        strictEqual(template1, template2, 'Should reuse existing template');
    });

    test('createPagination shows first and prev links when not on first page', () => {
        const el = createPagination('/page/', 5, 5, 50);
        ok(el);
        const firstLink = el.querySelector('.first a');
        const prevLink = el.querySelector('.prev a');
        ok(firstLink, 'Should have first link');
        ok(prevLink, 'Should have prev link');
        strictEqual(firstLink?.getAttribute('href'), '/page/0');
        strictEqual(prevLink?.getAttribute('href'), '/page/0');
    });

    test('createPagination hides first and prev links on first page', () => {
        const el = createPagination('/page/', 0, 5, 50);
        ok(el);
        const firstLink = el.querySelector('.first');
        const prevLink = el.querySelector('.prev');
        strictEqual(firstLink, null, 'Should not have first link on first page');
        strictEqual(prevLink, null, 'Should not have prev link on first page');
    });

    test('createPagination shows next and last links when not on last page', () => {
        const el = createPagination('/page/', 0, 5, 50);
        ok(el);
        const nextLink = el.querySelector('.next a');
        const lastLink = el.querySelector('.last a');
        ok(nextLink, 'Should have next link');
        ok(lastLink, 'Should have last link');
        strictEqual(nextLink?.getAttribute('href'), '/page/1');
        strictEqual(lastLink?.getAttribute('href'), '/page/9');
    });

    test('createPagination shows last item but no href on last page', () => {
        const el = createPagination('/page/', 45, 5, 50);
        ok(el);
        const nextLink = el.querySelector('.next');
        const lastItem = el.querySelector('.last');
        strictEqual(nextLink, null, 'Should not have next link on last page');
        ok(lastItem, 'Should have last item');
        strictEqual(lastItem.querySelector('a')?.getAttribute('href'), null, 'Last item should have no href');
    });

    test('createPagination handles large number of pages with PAGINATION_MAX_VISIBLE', () => {
        const el = createPagination('/page/', 0, 5, 200); // 40 pages total
        ok(el);
        const pageLinks = el.querySelectorAll('.page, .this');
        ok(pageLinks.length <= PAGINATION_MAX_VISIBLE, `Should not exceed ${PAGINATION_MAX_VISIBLE} page links`);
    });

    test('createPagination centers current page in pagination window', () => {
        // Create pagination with current page in middle
        const el = createPagination('/page/', 50, 5, 500); // Current page 10, total 100 pages
        ok(el);
        const currentPage = el.querySelector('.this span');
        ok(currentPage, 'Should have current page indicator');
        strictEqual(currentPage?.textContent, '11'); // Page 10 is displayed as page 11 (0-indexed)
    });

    test('createPagination adjusts window when near end of page list', () => {
        // Near the end of pages
        const el = createPagination('/page/', 475, 5, 500); // Page 95, total 100 pages
        ok(el);
        const lastLink = el.querySelector('.last a');
        strictEqual(lastLink?.getAttribute('href'), '/page/99');
    });
});

describe('table sorting', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    test('enableTableSort does not throw on empty table', () => {
        const table = document.createElement('table');
        enableTableSort(table);
        ok(true, 'enableTableSort should not throw');
    });

    test('enableTableSort adds sort buttons to headers with data-tablesort', () => {
        document.body.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th data-tablesort="text">Name</th>
                        <th data-tablesort="number">Age</th>
                        <th>No Sort</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>Alice</td><td>30</td><td>Data</td></tr>
                    <tr><td>Bob</td><td>25</td><td>Data</td></tr>
                </tbody>
            </table>
        `;

        enableTableSort();

        const headers = document.querySelectorAll('th[data-tablesort]');
        strictEqual(headers.length, 2);

        for (const header of Array.from(headers)) {
            const button = header.querySelector('button');
            ok(button, 'Should have button in sortable header');
            strictEqual(button?.type, 'button');
        }
    });

    test('enableTableSort handles text sorting', () => {
        document.body.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th data-tablesort="text">Name</th>
                    </tr>
                </thead>
                <tbody>
                    <tr data-tablesortKey="0"><td>Charlie</td></tr>
                    <tr data-tablesortKey="1"><td>Alice</td></tr>
                    <tr data-tablesortKey="2"><td>Bob</td></tr>
                </tbody>
            </table>
        `;

        enableTableSort();

        const button = document.querySelector('th[data-tablesort="text"] button') as HTMLButtonElement;
        ok(button, 'Should have sort button');

        // Click to sort
        button.click();

        const tbody = document.querySelector('tbody');
        const rows = tbody?.querySelectorAll('tr');
        strictEqual(rows?.[0].querySelector('td')?.textContent, 'Alice');
        strictEqual(rows?.[1].querySelector('td')?.textContent, 'Bob');
        strictEqual(rows?.[2].querySelector('td')?.textContent, 'Charlie');
    });

    test('enableTableSort handles number sorting', () => {
        document.body.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th data-tablesort="number">Age</th>
                    </tr>
                </thead>
                <tbody>
                    <tr data-tablesortKey="0"><td>30</td></tr>
                    <tr data-tablesortKey="1"><td>5</td></tr>
                    <tr data-tablesortKey="2"><td>100</td></tr>
                </tbody>
            </table>
        `;

        enableTableSort();

        const button = document.querySelector('th[data-tablesort="number"] button') as HTMLButtonElement;
        button.click();

        const tbody = document.querySelector('tbody');
        const rows = tbody?.querySelectorAll('tr');
        strictEqual(rows?.[0].querySelector('td')?.textContent, '5');
        strictEqual(rows?.[1].querySelector('td')?.textContent, '30');
        strictEqual(rows?.[2].querySelector('td')?.textContent, '100');
    });

    test('enableTableSort toggles sort direction', () => {
        document.body.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th data-tablesort="number">Value</th>
                    </tr>
                </thead>
                <tbody>
                    <tr data-tablesortKey="0"><td>3</td></tr>
                    <tr data-tablesortKey="1"><td>1</td></tr>
                    <tr data-tablesortKey="2"><td>2</td></tr>
                </tbody>
            </table>
        `;

        enableTableSort();

        const button = document.querySelector('th[data-tablesort="number"] button') as HTMLButtonElement;

        // First click - ascending
        button.click();
        let rows = document.querySelectorAll('tbody tr');
        strictEqual(rows[0].querySelector('td')?.textContent, '1');

        // Second click - descending
        button.click();
        rows = document.querySelectorAll('tbody tr');
        strictEqual(rows[0].querySelector('td')?.textContent, '3');
    });

    test('enableTableSort adds reset button to caption with data-tablesort-reset', () => {
        document.body.innerHTML = `
            <table>
                <caption data-tablesort-reset>Test Table</caption>
                <thead>
                    <tr>
                        <th data-tablesort="text">Name</th>
                    </tr>
                </thead>
                <tbody>
                    <tr data-tablesortKey="0"><td>Charlie</td></tr>
                    <tr data-tablesortKey="1"><td>Alice</td></tr>
                </tbody>
            </table>
        `;

        enableTableSort();

        const caption = document.querySelector('caption');
        const resetButton = caption?.querySelector('button');
        ok(resetButton, 'Should have reset button in caption');
        strictEqual(resetButton?.textContent, 'Reset Sort');
    });

    test('enableTableSort reset button restores original order', () => {
        document.body.innerHTML = `
            <table>
                <caption data-tablesort-reset>Test Table</caption>
                <thead>
                    <tr>
                        <th data-tablesort="text">Name</th>
                    </tr>
                </thead>
                <tbody>
                    <tr data-tablesortKey="0"><td>Charlie</td></tr>
                    <tr data-tablesortKey="1"><td>Alice</td></tr>
                    <tr data-tablesortKey="2"><td>Bob</td></tr>
                </tbody>
            </table>
        `;

        enableTableSort();

        const sortButton = document.querySelector('th[data-tablesort="text"] button') as HTMLButtonElement;
        const resetButton = document.querySelector('caption button') as HTMLButtonElement;

        // Sort first
        sortButton.click();
        let rows = document.querySelectorAll('tbody tr');
        strictEqual(rows[0].querySelector('td')?.textContent, 'Alice');

        // Reset
        resetButton.click();
        rows = document.querySelectorAll('tbody tr');
        strictEqual(rows[0].querySelector('td')?.textContent, 'Charlie');
        strictEqual(rows[1].querySelector('td')?.textContent, 'Alice');
        strictEqual(rows[2].querySelector('td')?.textContent, 'Bob');
    });

    test('enableTableSort handles date sorting with time element', () => {
        document.body.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th data-tablesort="date">Date</th>
                    </tr>
                </thead>
                <tbody>
                    <tr data-tablesortKey="0"><td><time datetime="2024-03-15">Mar 15</time></td></tr>
                    <tr data-tablesortKey="1"><td><time datetime="2024-01-10">Jan 10</time></td></tr>
                    <tr data-tablesortKey="2"><td><time datetime="2024-12-25">Dec 25</time></td></tr>
                </tbody>
            </table>
        `;

        enableTableSort();

        const button = document.querySelector('th[data-tablesort="date"] button') as HTMLButtonElement;
        button.click();

        const rows = document.querySelectorAll('tbody tr');
        const time1 = rows[0].querySelector('time')?.getAttribute('datetime');
        const time2 = rows[1].querySelector('time')?.getAttribute('datetime');
        const time3 = rows[2].querySelector('time')?.getAttribute('datetime');
        strictEqual(time1, '2024-01-10');
        strictEqual(time2, '2024-03-15');
        strictEqual(time3, '2024-12-25');
    });

    test('enableTableSort handles valueText sorting with input elements', () => {
        document.body.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th data-tablesort="valueText">Input</th>
                    </tr>
                </thead>
                <tbody>
                    <tr data-tablesortKey="0"><td><input type="text" value="Zebra"></td></tr>
                    <tr data-tablesortKey="1"><td><input type="text" value="Apple"></td></tr>
                    <tr data-tablesortKey="2"><td><input type="text" value="Mango"></td></tr>
                </tbody>
            </table>
        `;

        enableTableSort();

        const button = document.querySelector('th[data-tablesort="valueText"] button') as HTMLButtonElement;
        button.click();

        const rows = document.querySelectorAll('tbody tr');
        const value1 = (rows[0].querySelector('input') as HTMLInputElement).value;
        const value2 = (rows[1].querySelector('input') as HTMLInputElement).value;
        const value3 = (rows[2].querySelector('input') as HTMLInputElement).value;
        strictEqual(value1, 'Apple');
        strictEqual(value2, 'Mango');
        strictEqual(value3, 'Zebra');
    });

    test('enableTableSort handles valueNumeric sorting with select elements', () => {
        document.body.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th data-tablesort="valueNumeric">Select</th>
                    </tr>
                </thead>
                <tbody>
                    <tr data-tablesortKey="0"><td><select><option value="30" selected>Thirty</option></select></td></tr>
                    <tr data-tablesortKey="1"><td><select><option value="5" selected>Five</option></select></td></tr>
                    <tr data-tablesortKey="2"><td><select><option value="100" selected>Hundred</option></select></td></tr>
                </tbody>
            </table>
        `;

        enableTableSort();

        const button = document.querySelector('th[data-tablesort="valueNumeric"] button') as HTMLButtonElement;
        button.click();

        const rows = document.querySelectorAll('tbody tr');
        const value1 = (rows[0].querySelector('select') as HTMLSelectElement).value;
        const value2 = (rows[1].querySelector('select') as HTMLSelectElement).value;
        const value3 = (rows[2].querySelector('select') as HTMLSelectElement).value;
        strictEqual(value1, '5');
        strictEqual(value2, '30');
        strictEqual(value3, '100');
    });

    test('enableTableSort skips headers with unknown sort types', () => {
        document.body.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th data-tablesort="unknown-type">Column</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>Data</td></tr>
                </tbody>
            </table>
        `;

        enableTableSort();

        const header = document.querySelector('th[data-tablesort]');
        const button = header?.querySelector('button');
        strictEqual(button, null, 'Should not add button for unknown sort type');
    });

    test('enableTableSort works with scoped root element', () => {
        document.body.innerHTML = `
            <div id="container">
                <table>
                    <thead>
                        <tr>
                            <th data-tablesort="text">Name</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr data-tablesortKey="0"><td>Bob</td></tr>
                        <tr data-tablesortKey="1"><td>Alice</td></tr>
                    </tbody>
                </table>
            </div>
        `;

        const container = document.getElementById('container') as HTMLElement;
        enableTableSort(container);

        const button = container.querySelector('th[data-tablesort="text"] button') as HTMLButtonElement;
        ok(button, 'Should find button in scoped container');
    });
});
