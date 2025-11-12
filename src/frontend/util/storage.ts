/**
 * TODO: remove this file later. Used here only for testing import/include whiile transpiling.
 */

/**
 * Get a value from localStorage with type-safe return
 * @param key - The localStorage key
 * @param defaultValue - Default value if key doesn't exist
 * @returns The stored value or default
 */
export function getStorageItem(key: string, defaultValue?: string): string | undefined {
    try {
        return localStorage.getItem(key) ?? defaultValue;
    } catch {
        return defaultValue;
    }
}

/**
 * Set a value in localStorage
 * @param key - The localStorage key
 * @param value - The value to store
 */
export function setStorageItem(key: string, value: string): void {
    try {
        localStorage.setItem(key, value);
    } catch (err) {
        console.error('Failed to save to localStorage:', err);
    }
}

/**
 * Remove a value from localStorage
 * @param key - The localStorage key
 */
export function removeStorageItem(key: string): void {
    try {
        localStorage.removeItem(key);
    } catch (err) {
        console.error('Failed to remove from localStorage:', err);
    }
}
