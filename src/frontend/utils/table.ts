export const PAGINATION_TEMPLATE_ID = 'pagination-template';
export const PAGINATION_MAX_VISIBLE = 10;

function loadTemplate() {
    if (typeof globalThis.window === 'undefined' || typeof document === 'undefined') {
        throw new Error('table.ts: This module requires a browser environment with DOM APIs.');
    }
    let tpl = document.getElementById(PAGINATION_TEMPLATE_ID);
    if (!tpl) {
        tpl = document.createElement('template');
        tpl.id = PAGINATION_TEMPLATE_ID;
        tpl.innerHTML = `
        <div class="pagination">
            Pages:
            <ul>
                <li class="first"><a></a>First</li>
                <li class="prev"><a title="previous" rel="previous">&laquo;</a></li>
                <li class="this"><span></span></li>
                <li class="page"><a></a></li>
                <li class="next"><a title="next" rel="next">&raquo;</a></li>
                <li class="last"><a></a>Last</li>
            </ul>
        </div>
    `;
        document.body.appendChild(tpl);
    }
}

export function createPagination(
    urlRoot: string,
    current: number,
    perPage: number,
    totalArticles: number,
): HTMLElement | undefined {
    loadTemplate();
    function cloneNode<T extends Node>(el: T, deep = true): T {
        return el.cloneNode(deep) as T;
    }
    if (totalArticles <= perPage) return undefined;
    const tpl = document.getElementById(PAGINATION_TEMPLATE_ID) as HTMLTemplateElement | null;
    if (!tpl) return undefined;
    const instance = tpl.content.firstElementChild?.cloneNode(true) as HTMLElement;
    const ul = instance.querySelector('ul');
    if (!ul) return undefined;
    const liFirst = ul.querySelector('li.first') as HTMLLIElement;
    const liPrev = ul.querySelector('li.prev') as HTMLLIElement;
    const liThis = ul.querySelector('li.this') as HTMLLIElement;
    const liPage = ul.querySelector('li.page') as HTMLLIElement;
    const liNext = ul.querySelector('li.next') as HTMLLIElement;
    const liLast = ul.querySelector('li.last') as HTMLLIElement;
    ul.replaceChildren();
    const currentPage = Math.floor(current / perPage);
    const lastPage = Math.floor((totalArticles - 1) / perPage);
    if (currentPage > 0) {
        const firstClone = cloneNode(liFirst);
        firstClone.querySelector('a')?.setAttribute('href', `${urlRoot}0`);
        ul.appendChild(firstClone);
        const prevClone = cloneNode(liPrev);
        prevClone.querySelector('a')?.setAttribute('href', `${urlRoot}${currentPage - 1}`);
        ul.appendChild(prevClone);
    }
    let counter: number, endPage: number;
    if (lastPage > PAGINATION_MAX_VISIBLE - 1) {
        counter =
            currentPage < Math.floor(PAGINATION_MAX_VISIBLE / 2) ? 0 : currentPage - Math.floor(PAGINATION_MAX_VISIBLE / 2) + 1;
        endPage = counter + PAGINATION_MAX_VISIBLE - 1;
        if (endPage > lastPage) {
            endPage = lastPage;
            counter = endPage - PAGINATION_MAX_VISIBLE + 1;
            if (counter < 0) counter = 0;
        }
    } else {
        counter = 0;
        endPage = lastPage;
    }
    for (let i = counter; i <= endPage; i++) {
        let li: HTMLLIElement;
        let txt: HTMLElement;
        if (i === currentPage) {
            li = cloneNode(liThis);
            txt = li.querySelector('span')!;
        } else {
            li = cloneNode(liPage);
            txt = li.querySelector('a')!;
            txt.setAttribute('href', `${urlRoot}${i}`);
        }
        txt.textContent = (txt.textContent + (i + 1).toString()).trim();
        ul.appendChild(li);
    }
    if (currentPage < lastPage) {
        const nextClone = cloneNode(liNext);
        nextClone.querySelector('a')!.setAttribute('href', `${urlRoot}${currentPage + 1}`);
        ul.appendChild(nextClone);
        const lastClone = cloneNode(liLast);
        lastClone.querySelector('a')!.setAttribute('href', `${urlRoot}${lastPage}`);
        ul.appendChild(lastClone);
    } else {
        const lastClone = cloneNode(liLast);
        ul.appendChild(lastClone);
    }
    return instance;
}

export function enableTableSort(root: Document | HTMLElement = document): void {
    type SortFn = (a: { value: unknown }, b: { value: unknown }) => number;
    type GetFn = (cell: HTMLElement) => unknown;
    const comps = {
        number: (a: { value: unknown }, b: { value: unknown }) => (a.value as number) - (b.value as number),
        text: (a: { value: unknown }, b: { value: unknown }) =>
            (a.value as string) > (b.value as string) ? 1 : (a.value as string) < (b.value as string) ? -1 : 0,
    };
    let rxMatch: (text: string) => string;
    const sorts: Record<string, { get: GetFn; sort: SortFn }> = {
        date: {
            get(cell: HTMLElement) {
                const time = cell.querySelector('time');
                if (time) {
                    const datetime = time.getAttribute('datetime');
                    return Date.parse(datetime || rxMatch(time.textContent || ''));
                }
                return Date.parse(rxMatch(cell.textContent || ''));
            },
            sort: comps.number,
        },
        number: {
            get(cell: HTMLElement) {
                return +(sorts.text.get(cell) || 0);
            },
            sort: comps.number,
        },
        text: {
            get(cell: HTMLElement) {
                return rxMatch(cell.textContent || '');
            },
            sort: comps.text,
        },
        valueNumeric: {
            get(cell: HTMLElement) {
                return +(sorts.valueText.get(cell) ?? 0);
            },
            sort: comps.number,
        },
        valueText: {
            get(cell: HTMLElement) {
                const formElement = cell.querySelector('input, select, textarea, button') as
                    | HTMLInputElement
                    | HTMLSelectElement
                    | HTMLTextAreaElement
                    | HTMLButtonElement
                    | null;
                return rxMatch(formElement ? Object(formElement).value : cell.textContent);
            },
            sort: comps.text,
        },
    };
    function makeButton(
        text: string | null,
        click: ((ev: Event) => void) | null,
        parent: HTMLElement,
        replace?: boolean,
    ): HTMLButtonElement {
        const e = document.createElement('button');
        e.type = 'button';
        if (text) e.textContent = text;
        if (click) e.onclick = click;
        e.setAttribute('aria-label', text || 'Sort');
        if (parent) {
            if (replace) parent.textContent = '';
            parent.appendChild(e);
        }
        return e;
    }
    function sortAndSet(tbody: HTMLTableSectionElement, sortCall: SortFn, getValue: (row: HTMLTableRowElement) => unknown) {
        let e = tbody.firstElementChild as HTMLTableRowElement | null;
        const list: { tr: HTMLTableRowElement; value: unknown }[] = [];
        if (!e) return;
        do {
            list.push({ tr: e, value: getValue(e) });
        } while ((e = e.nextElementSibling as HTMLTableRowElement | null));
        list.sort(sortCall);
        for (const row of list) tbody.appendChild(row.tr);
    }
    function tableSort(event: Event) {
        const button = event.currentTarget as HTMLButtonElement;
        const th = button.parentNode as HTMLTableCellElement;
        if (!th || !th.dataset.tablesort) return;
        const type = sorts[th.dataset.tablesort!];
        const regex = th.dataset.tablesortRxmatch ? new RegExp(th.dataset.tablesortRxmatch) : false;
        let e: Element | null = th;
        rxMatch = regex
            ? (text: string) => {
                  const result = text.match(regex as RegExp);
                  return result == null ? '' : result[0];
              }
            : (text: string) => text;
        while ((e = e.previousElementSibling)) (e.firstElementChild as HTMLButtonElement).value = '';
        e = th;
        while ((e = e.nextElementSibling)) (e.firstElementChild as HTMLButtonElement).value = '';
        const table = th.closest('table')!;
        const tbody = table.tBodies[0];
        const colIdx = th.cellIndex;
        sortAndSet(
            tbody,
            (button.value = button.value === '1' ? '0' : '1') === '1' ? type.sort : (a, b) => type.sort(b, a),
            (row) => type.get(row.cells[colIdx]),
        );
    }
    function tableReset(event: Event) {
        const table = (event.currentTarget as HTMLElement).parentNode!.parentNode as HTMLTableElement;
        let e = table.tHead!.firstElementChild!.firstElementChild as HTMLElement | null;
        if (e)
            do {
                if (e.firstElementChild && (e.firstElementChild as HTMLElement).tagName === 'BUTTON') {
                    (e.firstElementChild as HTMLButtonElement).value = '';
                }
            } while ((e = e.nextElementSibling as HTMLElement | null));
        sortAndSet(table.tBodies[0], comps.number, (row) => +row.getAttribute('data-tablesortKey')!);
    }
    for (const th of Array.from(root.querySelectorAll('th[data-tablesort]'))) {
        if (!sorts[(th as HTMLElement).dataset.tablesort!]) continue;
        makeButton(th.textContent, tableSort, th as HTMLElement, true);
    }
    for (const caption of Array.from(root.querySelectorAll('caption[data-tablesort-reset]'))) {
        let i = 0;
        for (const tr of Array.from((caption.parentNode as HTMLElement).querySelectorAll('tbody tr'))) {
            tr.setAttribute('data-tablesortKey', (i++).toString());
        }
        makeButton('Reset Sort', tableReset, caption as HTMLElement);
    }
}
