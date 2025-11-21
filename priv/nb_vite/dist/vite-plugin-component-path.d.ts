/**
 * Vite plugin for adding data-nb-component attribute to all React/Vue components
 *
 * This plugin transforms component files to add a data-nb-component attribute
 * to the root element, showing the source file path for easier debugging.
 *
 * Example output:
 *   <div data-nb-component="assets/js/pages/Users/Show.tsx">...</div>
 */
import type { Plugin } from 'vite';
export interface ComponentPathPluginOptions {
    /**
     * Enable or disable the plugin
     * Only runs in development mode by default
     * @default true (in development)
     */
    enabled?: boolean;
    /**
     * Root directory for component paths (default: 'assets')
     * @default 'assets'
     */
    root?: string;
    /**
     * Include file extensions in component paths
     * @default true
     */
    includeExtension?: boolean;
    /**
     * Enable verbose logging
     * @default false
     */
    verbose?: boolean;
}
/**
 * Creates a Vite plugin that adds data-nb-component to all components
 *
 * @example
 * ```typescript
 * import { defineConfig } from 'vite';
 * import { componentPath } from '@nordbeam/nb-vite/component-path';
 *
 * export default defineConfig({
 *   plugins: [
 *     componentPath({
 *       enabled: true
 *     })
 *   ]
 * });
 * ```
 */
export declare function componentPath(options?: ComponentPathPluginOptions): Plugin;
export default componentPath;
