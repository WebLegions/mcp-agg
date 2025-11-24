/// <reference lib="dom" />
import { strict as assert } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { before, beforeEach, describe, test } from 'node:test';
import type { AppContext } from '../../main';
import type { JurisInstance, JurisVDOMElement } from '../../types/juris';
import { type NavRoute, navBar } from './index';

describe('NavBar Component (DOM Rendering)', () => {
    let juris: JurisInstance;

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

        // Create Juris instance
        juris = new Juris({
            states: { 'url.path': '/' },
        });

        // Create a wrapper component that provides router context
        const navBarWrapper = (props: { routes: NavRoute[] }, ctx: AppContext) => {
            // Mock router in context
            const mockRouter = {
                getState: () => 'url.path',
                navigate: (path: string) => {
                    ctx.setState('url.path', path);
                },
            };

            // Create context with router
            const contextWithRouter = {
                ...ctx,
                router: mockRouter,
            } as AppContext;

            // Call original navBar with mocked context
            return navBar(props, contextWithRouter);
        };

        juris.registerComponent('navBar', navBarWrapper as never);
    });

    // Before each test: Clear the body and state
    beforeEach(() => {
        document.body.innerHTML = '';
        juris.createContext().setState('url.path', '/');
    });

    test('should render navigation links from routes prop', () => {
        const routes: NavRoute[] = [
            { path: '/', label: 'Home' },
            { path: '/about', label: 'About' },
            { path: '/contact', label: 'Contact' },
        ];

        const vnode: JurisVDOMElement = {
            div: {
                children: [
                    {
                        navBar: {
                            routes,
                        },
                    },
                ],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Verify nav element exists
        const nav = document.querySelector('nav');
        assert.ok(nav, 'Nav element should exist');
        assert.equal(nav.getAttribute('aria-label'), 'Main navigation');

        // Verify links
        const links = nav.querySelectorAll('a');
        assert.equal(links.length, 3, 'Should have 3 navigation links');

        assert.equal(links[0].href.endsWith('/'), true);
        assert.equal(links[0].textContent, 'Home');

        assert.equal(links[1].href.endsWith('/about'), true);
        assert.equal(links[1].textContent, 'About');

        assert.equal(links[2].href.endsWith('/contact'), true);
        assert.equal(links[2].textContent, 'Contact');
    });

    test('should apply active styles to current route', () => {
        juris.createContext().setState('url.path', '/about');

        const routes: NavRoute[] = [
            { path: '/', label: 'Home' },
            { path: '/about', label: 'About' },
        ];

        const vnode: JurisVDOMElement = {
            div: {
                children: [
                    {
                        navBar: {
                            routes,
                        },
                    },
                ],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        const links = document.querySelectorAll('nav a');
        assert.equal(links.length, 2);

        // Home link should have inactive opacity
        const homeLink = links[0] as HTMLElement;
        assert.equal(homeLink.style.opacity, '0.7', 'Inactive link should have 0.7 opacity');

        // About link should have full opacity (active)
        const aboutLink = links[1] as HTMLElement;
        assert.equal(aboutLink.style.opacity, '1', 'Active link should have full opacity');

        // About link should have aria-current
        assert.equal(aboutLink.getAttribute('aria-current'), 'page');
    });

    test('should handle empty routes array', () => {
        const vnode: JurisVDOMElement = {
            div: {
                children: [
                    {
                        navBar: {
                            routes: [],
                        },
                    },
                ],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        const nav = document.querySelector('nav');
        assert.ok(nav, 'Nav element should exist');

        const links = nav?.querySelectorAll('a');
        assert.equal(links?.length, 0, 'Should have no links');
    });
});
