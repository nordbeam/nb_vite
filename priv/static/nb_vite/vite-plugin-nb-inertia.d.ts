import { Plugin } from "vite";
//#region src/vite-plugin-nb-inertia.d.ts
interface NbInertiaPluginOptions {
  /**
   * Enable or disable the plugin
   * @default true
   */
  enabled?: boolean;
  /**
   * Directory containing colocated extracted pages (from ~TSX sigils).
   * Relative to the Vite root (assets/) or absolute.
   * @default '../.nb_inertia/pages'
   */
  pagesDir?: string;
  /**
   * Directory containing standalone page components.
   * Relative to the Vite root (assets/) or absolute.
   * @default 'pages'
   */
  standaloneDir?: string;
  /**
   * Glob patterns for .ex page files to watch in dev mode.
   * Relative to the project root (parent of assets/).
   */
  watchPaths?: string[];
  /**
   * Debounce delay in milliseconds for extraction triggering.
   * @default 100
   */
  debounce?: number;
  /**
   * HTTP URL for the extraction GenServer endpoint.
   * When set, extraction is triggered via HTTP instead of spawning a mix task.
   * @default undefined
   */
  extractUrl?: string;
  /**
   * Mix command to run for extraction (fallback when extractUrl is not set).
   * @default 'mix nb_inertia.extract'
   */
  extractCmd?: string;
  /**
   * Working directory for the extraction command.
   * @default process.cwd()
   */
  cwd?: string;
  /**
   * File extensions to consider when resolving page components.
   * @default ['.tsx', '.jsx', '.vue']
   */
  extensions?: string[];
  /**
   * Enable verbose logging.
   * @default false
   */
  verbose?: boolean;
}
/**
 * Creates a Vite plugin for nb_inertia colocated page component resolution and HMR.
 *
 * @example
 * ```typescript
 * import { defineConfig, lazyPlugins } from 'vite-plus';
 * import { nbInertia } from '@nordbeam/nb-vite/nb-inertia';
 *
 * export default defineConfig({
 *   plugins: lazyPlugins(() => [
 *     nbInertia({
 *       enabled: true,
 *       verbose: true
 *     })
 *   ])
 * });
 * ```
 */
declare function nbInertia(options?: NbInertiaPluginOptions): Plugin;
//#endregion
export { NbInertiaPluginOptions, nbInertia as default, nbInertia };