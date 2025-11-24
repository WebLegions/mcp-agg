/// <reference lib="dom" />
import { strict as assert } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { before, beforeEach, describe, test } from 'node:test';
import type { AppComponent, AppContext } from '../main';
import type { JurisInstance, JurisVDOMElement } from '../types/juris';

describe('AppShell Component (DOM Rendering)', () => {
    let juris: JurisInstance;
    let appShell: AppComponent;

    // One-time setup: Create DOM and load Juris
    before(async () => {
        // Load Juris library via script tag
        const jurisPath = resolve(process.cwd(), 'node_modules/juris/juris.js');
        const jurisCode = readFileSync(jurisPath, 'utf-8');

        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.textContent = jurisCode;
        document.head.appendChild(script);

        // Execute script in window context
        Object(window).eval(jurisCode);

        juris = new Juris({
            states: {
                'url.path': '/',
                'servers.loading': false,
                'servers.items': [],
            },
        });

        // Dynamically import app-shell after Juris is loaded
        const appShellModule = await import('./app-shell');
        appShell = appShellModule.appShell;

        // Create a wrapper that provides necessary context
        const appShellWrapper = (props: Record<string, unknown>, ctx: AppContext) => {
            // Mock router, config, and api in context
            const mockRouter = {
                getState: () => 'url.path',
                navigate: (path: string) => {
                    ctx.setState('url.path', path);
                },
                matchRoute: (_path: string) => ({
                    route: { component: 'configPage' },
                    params: {},
                    query: {},
                }),
                getConfig: () => ({ routes: {} }),
                addRoute: () => {},
                configure: () => {},
            };

            const mockConfig = {
                loadServers: () => Promise.resolve(),
            };

            const mockApi = {};

            // Create context with mocks
            const contextWithMocks = {
                ...ctx,
                router: mockRouter,
                config: mockConfig,
                api: mockApi,
            } as unknown as AppContext;

            // Call original appShell with mocked context
            return appShell(props, contextWithMocks);
        };

        // Register appShell wrapper and its dependencies as simple stubs
        juris.registerComponent('appShell', appShellWrapper as never);
        juris.registerComponent('navBar', (() => ({
            nav: {
                'aria-label': 'Main navigation',
                children: [],
            },
        })) as never);
        juris.registerComponent('configPage', (() => ({ div: { text: 'Config Page' } })) as never);
        juris.registerComponent('healthPage', (() => ({ div: { text: 'Health Page' } })) as never);
        juris.registerComponent('swaggerPage', (() => ({ div: { text: 'Swagger Page' } })) as never);
        juris.registerComponent('icon', ((props: Record<string, unknown>) => ({
            div: {
                'aria-label': props.ariaLabel || '',
                onClick: props.onClick,
                children: props.image ? [{ svg: props.image }] : [],
            },
        })) as never);
        juris.registerComponent('themeSwitch', (() => ({ div: { class: 'theme-switch' } })) as never);
        juris.registerComponent('envModal', (() => ({ div: { class: 'env-modal' } })) as never);
    });

    // Before each test: Clear the body
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    test('should render main layout structure with nav, main, and footer', () => {
        const vnode: JurisVDOMElement = {
            div: {
                children: [
                    {
                        appShell: {
                            app: {} as never,
                        },
                    },
                ],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Verify navigation exists
        const nav = document.querySelector('nav[aria-label="Main navigation"]');
        assert.ok(nav, 'Navigation should exist');

        // Verify main content area exists
        const main = document.querySelector('main');
        assert.ok(main, 'Main content area should exist');

        // Verify footer exists
        const footer = document.querySelector('footer');
        assert.ok(footer, 'Footer should exist');

        // Verify GitHub link in footer
        const githubLink = footer?.querySelector('a[href="https://github.com/eram/mcp-agg"]');
        assert.ok(githubLink, 'GitHub link should exist');
        assert.equal(githubLink.getAttribute('target'), '_blank');
        assert.equal(githubLink.getAttribute('rel'), 'noopener noreferrer');
        assert.equal(githubLink.textContent, 'GitHub');
    });

    test('should render bottom-right controls with info icon and theme switch', () => {
        const vnode: JurisVDOMElement = {
            div: {
                children: [
                    {
                        appShell: {
                            app: {} as never,
                        },
                    },
                ],
            },
        };

        const element = juris.objectToHtml(vnode);
        document.body.appendChild(element as Node);

        // Verify bottom-right controls container
        const controls = document.querySelector('.bottom-right-controls');
        assert.ok(controls, 'Bottom-right controls should exist');

        const controlsEl = controls as HTMLElement;
        assert.equal(controlsEl.style.position, 'fixed');
        assert.equal(controlsEl.style.zIndex, '1000');

        // Verify info icon (may be rendered as a div with onclick)
        const icons = controls.querySelectorAll('div');
        assert.ok(icons.length > 0, 'Control icons should exist');

        // Verify theme switch
        const themeSwitch = controls.querySelector('.theme-switch');
        assert.ok(themeSwitch, 'Theme switch should exist');
    });
});
