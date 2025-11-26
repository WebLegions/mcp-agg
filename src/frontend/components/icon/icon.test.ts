/// <reference lib="dom" />
import { strict as assert } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { before, beforeEach, describe, test } from 'node:test';
import type { j } from '../../main';
import { icon } from './index';

describe('Icon Component (DOM Rendering)', () => {
    let juris: j.juris.JurisInstance;

    const mockSvg = {
        viewBox: '0 0 24 24',
        children: [
            {
                circle: {
                    cx: '12',
                    cy: '12',
                    r: '10',
                    class: 'icon-bg',
                },
            },
            {
                text: {
                    x: '12',
                    y: '16',
                    textAnchor: 'middle',
                    class: 'icon-text',
                    text: 'i',
                },
            },
        ],
    };

    // One-time setup: Create DOM and load Juris
    before(() => {
        // Load Juris library via script tag
        const jurisPath = resolve(process.cwd(), 'node_modules/juris/juris.js');
        const jurisCode = readFileSync(jurisPath, 'utf-8');

        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.textContent = jurisCode;
        document.head.appendChild(script);

        // Execute script in window context
        Object(window).eval(jurisCode);

        juris = new Juris({ states: {} });
        juris.registerComponent('icon', icon as never);
    });

    // Before each test: Clear the body
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    test('should render icon with SVG and proper accessibility attributes', () => {
        const vnode: j.Elem = {
            div: {
                children: [
                    {
                        icon: {
                            image: mockSvg,
                            ariaLabel: 'Test icon',
                        },
                    },
                ],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Verify icon container
        const iconDiv = document.querySelector('div > div');
        assert.ok(iconDiv, 'Icon div should exist');
        assert.equal(iconDiv.getAttribute('aria-label'), 'Test icon');
        assert.equal(iconDiv.getAttribute('title'), 'Test icon');

        // Non-interactive icon should not have button role
        // getAttribute returns 'undefined' string when attribute set to undefined in Juris
        const role = iconDiv.getAttribute('role');
        assert.ok(role === null || role === 'undefined', `Expected role to be null or 'undefined', got ${role}`);
        const tabindex = iconDiv.getAttribute('tabindex');
        assert.ok(tabindex === null || tabindex === 'undefined', `Expected tabindex to be null or 'undefined', got ${tabindex}`);

        // Verify SVG is rendered
        const svg = iconDiv.querySelector('svg');
        assert.ok(svg, 'SVG should exist');
        assert.equal(svg.getAttribute('viewBox'), '0 0 24 24');

        // Verify SVG children
        const circle = svg.querySelector('circle.icon-bg');
        assert.ok(circle, 'Icon background circle should exist');
        const text = svg.querySelector('text.icon-text');
        assert.ok(text, 'Icon text should exist');
    });

    test('should render interactive icon with button role and handle click/keyboard events', () => {
        let clickCount = 0;
        const handleClick = () => {
            clickCount++;
        };

        const vnode: j.Elem = {
            div: {
                children: [
                    {
                        icon: {
                            image: mockSvg,
                            ariaLabel: 'Interactive icon',
                            title: 'Custom Title',
                            onClick: handleClick,
                        },
                    },
                ],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        const iconDiv = document.querySelector('div > div');
        assert.ok(iconDiv, 'Icon div should exist');

        // Interactive icon should have button role and tabindex
        assert.equal(iconDiv.getAttribute('role'), 'button');
        assert.equal(iconDiv.getAttribute('tabindex'), '0');
        assert.equal(iconDiv.getAttribute('title'), 'Custom Title');

        // Test click event
        (iconDiv as HTMLElement).click();
        assert.equal(clickCount, 1, 'Click handler should be called');

        // Test Enter key
        const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
        iconDiv.dispatchEvent(enterEvent);
        assert.equal(clickCount, 2, 'Enter key should trigger click');

        // Test Space key
        const spaceEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
        iconDiv.dispatchEvent(spaceEvent);
        assert.equal(clickCount, 3, 'Space key should trigger click');

        // Test other key (should not trigger click)
        const otherEvent = new KeyboardEvent('keydown', { key: 'A', bubbles: true });
        iconDiv.dispatchEvent(otherEvent);
        assert.equal(clickCount, 3, 'Other keys should not trigger click');
    });

    test('should handle hover events and render with proper cursor style', () => {
        let hoverCount = 0;
        const handleHover = () => {
            hoverCount++;
        };

        const vnode: j.Elem = {
            div: {
                children: [
                    {
                        icon: {
                            image: mockSvg,
                            ariaLabel: 'Hover icon',
                            onClick: () => {},
                            onHover: handleHover,
                        },
                    },
                ],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        const iconDiv = document.querySelector('div > div') as HTMLElement;
        assert.ok(iconDiv, 'Icon div should exist');

        // Interactive icon should have pointer cursor
        assert.ok(
            iconDiv.style.cursor === 'pointer' || iconDiv.style.cursor.includes('pointer'),
            'Interactive icon should have pointer cursor',
        );

        // Test hover event
        const hoverEvent = new MouseEvent('mouseenter', { bubbles: true });
        iconDiv.dispatchEvent(hoverEvent);
        assert.equal(hoverCount, 1, 'Hover handler should be called');
    });
});
