/**
 * Components barrel export
 * Re-exports all components and registers custom elements
 */

import { ThemeToggle } from './theme-toggle/component';

// Register custom elements
customElements.define('theme-toggle', ThemeToggle);

// Export components
export { ThemeToggle };
