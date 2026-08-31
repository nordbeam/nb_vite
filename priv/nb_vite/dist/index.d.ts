import nbRoutes from "./vite-plugin-nb-routes.js";
import { PluginOption, Rollup } from "vite";
//#region node_modules/vite-plugin-full-reload/dist/index.d.cts
/**
 * Configuration for the watched paths.
 */
interface Config {
  /**
   * Whether full reload should happen regardless of the file path.
   * @default true
   */
  always?: boolean;
  /**
   * How many milliseconds to wait before reloading the page after a file change.
   * @default 0
   */
  delay?: number;
  /**
   * Whether to log when a file change triggers a full reload.
   * @default true
   */
  log?: boolean;
  /**
   * Files will be resolved against this path.
   * @default process.cwd()
   */
  root?: string;
}
//#endregion
//#region src/index.d.ts
interface SSRConfig {
  /**
   * Enable SSR dev server endpoint
   * @default false
   */
  enabled?: boolean;
  /**
   * The path where the SSR endpoint will be available
   * @default '/ssr'
   */
  path?: string;
  /**
   * The path for the health check endpoint
   * @default '/ssr-health'
   */
  healthPath?: string;
  /**
   * The entry point for SSR rendering in development.
   * If not set, defaults to the `ssr` option value (unified entry for dev and prod).
   * @default Uses `ssr` option value, or './js/ssr.tsx' if ssr is not a string
   */
  entryPoint?: string;
  /**
   * The path to the SSR "hot" file
   * @default 'priv/ssr-hot'
   */
  hotFile?: string;
}
interface PluginConfig {
  /**
   * The path or paths of the entry points to compile.
   */
  input: string | string[] | Rollup.InputOption;
  /**
   * Phoenix's public directory.
   *
   * @default 'priv/static'
   */
  publicDirectory?: string;
  /**
   * The public subdirectory where compiled assets should be written.
   *
   * @default 'assets'
   */
  buildDirectory?: string;
  /**
   * The path to the "hot" file.
   *
   * @default 'priv/hot'
   */
  hotFile?: string;
  /**
   * The path to the manifest file.
   *
   * @default 'priv/static/assets/manifest.json'
   */
  manifestPath?: string;
  /**
   * The path of the SSR entry point for production builds.
   */
  ssr?: string | string[] | Rollup.InputOption;
  /**
   * The directory where the SSR bundle should be written.
   *
   * @default 'priv/ssr'
   */
  ssrOutputDirectory?: string;
  /**
   * SSR development server configuration.
   * Set to true to enable with defaults, or provide configuration object.
   *
   * @default false
   */
  ssrDev?: boolean | SSRConfig;
  /**
   * Enable React Refresh (for React projects).
   *
   * @default false
   */
  reactRefresh?: boolean;
  /**
   * Configuration for performing full page refresh on file changes.
   *
   * {@link https://github.com/ElMassimo/vite-plugin-full-reload}
   * @default false
   */
  refresh?: boolean | string | string[] | RefreshConfig | RefreshConfig[];
  /**
   * Detect TLS certificates for local development.
   * Can be set to true to auto-detect, false to disable, or a string for a specific host.
   *
   * @default null
   */
  detectTls?: string | boolean | null;
  /**
   * Transform the code while serving.
   */
  transformOnServe?: (code: string, url: string) => string;
}
interface RefreshConfig {
  paths: string[];
  config?: Config;
}
declare const refreshPaths: string[];
declare function phoenix(config: string | string[] | PluginConfig): PluginOption[];
//#endregion
export { phoenix as default, phoenix, nbRoutes, refreshPaths };