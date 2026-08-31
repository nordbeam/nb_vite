import { Plugin } from "vite";
//#region src/vite-plugin-nb-routes.d.ts
interface NbRoutesPluginOptions {
  /**
   * Enable or disable the plugin
   * @default true
   */
  enabled?: boolean;
  /**
   * Glob pattern or array of patterns for router files to watch
   * Defaults to Phoenix router locations
   */
  routerPath?: string | string[];
  /**
   * Debounce delay in milliseconds
   * @default 300
   */
  debounce?: number;
  /**
   * Enable verbose logging
   * @default false
   */
  verbose?: boolean;
  /**
   * Path to the generated routes file (for HMR invalidation)
   * @default 'assets/js/routes.js'
   */
  routesFile?: string;
  /**
   * Mix command to run for route generation
   * @default 'mix nb_routes.gen'
   */
  command?: string;
  /**
   * Working directory for the command execution
   * @default process.cwd()
   */
  cwd?: string;
}
/**
 * Creates a Vite plugin for nb_routes auto-regeneration
 *
 * @example
 * ```typescript
 * import { defineConfig, lazyPlugins } from 'vite-plus';
 * import { nbRoutes } from '@nordbeam/nb-vite/nb-routes';
 *
 * export default defineConfig({
 *   plugins: lazyPlugins(() => [
 *     nbRoutes({
 *       enabled: true,
 *       verbose: true
 *     })
 *   ])
 * });
 * ```
 */
declare function nbRoutes(options?: NbRoutesPluginOptions): Plugin;
//#endregion
export { NbRoutesPluginOptions, nbRoutes as default, nbRoutes };