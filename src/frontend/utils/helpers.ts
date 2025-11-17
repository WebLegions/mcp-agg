/**
 * Frontend utility helper functions
 */

/**
 * Load a CSS file dynamically if not already loaded
 * @param href - The path to the CSS file
 * @returns true if CSS was loaded, false if already exists
 */
export function loadCss(href: string): boolean {
    // Check if already loaded
    if (document.querySelector(`link[href="${href}"][rel="stylesheet"]`)) {
        return false;
    }

    // Create link element
    const link = document.createElement('link');
    link.href = href;
    link.rel = 'stylesheet';

    document.head.appendChild(link);
    return true;
}
