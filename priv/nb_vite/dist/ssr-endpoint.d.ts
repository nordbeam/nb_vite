import { Plugin } from "vite";
interface SSREndpointOptions {
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
     * The entry point for SSR rendering
     * @default './js/ssr_dev.tsx'
     */
    entryPoint?: string;
}
/**
 * Vite plugin that adds an SSR endpoint to the dev server
 *
 * This plugin uses vite-node internally to handle SSR rendering,
 * but runs within the Vite dev server process itself.
 *
 * Usage in vite.config.js:
 *   import { ssrEndpoint } from 'phoenix-vite-plugin/ssr';
 *
 *   export default {
 *     plugins: [
 *       react(),
 *       ssrEndpoint(),
 *     ]
 *   }
 *
 * Then access SSR at: http://localhost:5173/ssr
 */
export declare function ssrEndpoint(options?: SSREndpointOptions): Plugin;
export {};
