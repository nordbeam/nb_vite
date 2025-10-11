import { Plugin, ViteDevServer } from "vite";
import { ViteNodeServer } from "vite-node/server";
import { ViteNodeRunner } from "vite-node/client";
import { installSourcemapsSupport } from "vite-node/source-map";
import { resolve } from "path";
import { IncomingMessage, ServerResponse } from "http";

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

interface SSRRenderFunction {
  (page: unknown): Promise<unknown>;
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
export function ssrEndpoint(options: SSREndpointOptions = {}): Plugin {
  const {
    path = '/ssr',
    healthPath = '/ssr-health',
    entryPoint = './js/ssr_dev.tsx',
  } = options;

  let viteNodeServer: ViteNodeServer;
  let viteNodeRunner: ViteNodeRunner;
  let cachedRender: SSRRenderFunction | null = null;

  return {
    name: 'vite-ssr-endpoint',

    async configureServer(viteServer: ViteDevServer) {
      console.log('[ssr-plugin] Initializing SSR endpoint...');

      // Create vite-node server that uses the existing Vite instance
      // @ts-ignore - vite-node has its own vite version as dependency, types may mismatch
      viteNodeServer = new ViteNodeServer(viteServer);

      // Install source map support
      installSourcemapsSupport({
        getSourceMap: (source) => viteNodeServer.getSourceMap(source),
      });

      // Create vite-node runner
      viteNodeRunner = new ViteNodeRunner({
        root: viteServer.config.root,
        base: viteServer.config.base,
        fetchModule(id) {
          return viteNodeServer.fetchModule(id, "ssr");
        },
        resolveId(id, importer) {
          return viteNodeServer.resolveId(id, importer, "ssr");
        },
      });

      // Watch for file changes and invalidate cache
      viteServer.watcher.on('change', async (file: string) => {
        const jsDir = resolve(viteServer.config.root, "./js");
        if (!file.startsWith(jsDir) || !file.match(/\.(tsx?|jsx?)$/)) {
          return;
        }

        console.log(`[ssr-plugin] File changed: ${file.replace(viteServer.config.root, '')}`);

        // Invalidate the changed module
        const mods = await viteServer.moduleGraph.getModulesByFile(file);
        if (mods) {
          for (const mod of mods) {
            await viteServer.moduleGraph.invalidateModule(mod);
          }
        }

        // Clear vite-node cache
        viteNodeRunner.moduleCache.delete(file);
        cachedRender = null;

        console.log('[ssr-plugin] Cache invalidated - will reload on next request');
      });

      // Load the render function
      async function loadRenderFunction(): Promise<SSRRenderFunction> {
        if (!cachedRender) {
          const ssrEntryPath = resolve(viteServer.config.root, entryPoint);
          console.log(`[ssr-plugin] Loading SSR entry: ${ssrEntryPath}`);

          // Invalidate module graph for fresh reload
          const mods = await viteServer.moduleGraph.getModulesByFile(ssrEntryPath);
          if (mods) {
            for (const mod of mods) {
              await viteServer.moduleGraph.invalidateModule(mod);
            }
          }

          // Clear vite-node cache
          viteNodeRunner.moduleCache.clear();

          // Execute the module
          const ssrModule = await viteNodeRunner.executeFile(ssrEntryPath) as { render?: SSRRenderFunction };

          if (!ssrModule.render || typeof ssrModule.render !== 'function') {
            throw new Error('SSR entry must export a "render" function');
          }

          cachedRender = ssrModule.render;
          console.log('[ssr-plugin] SSR render function loaded successfully');
        }

        return cachedRender;
      }

      // Helper to read request body
      function readBody(req: IncomingMessage): Promise<string> {
        return new Promise((resolve, reject) => {
          let body = '';
          req.on('data', (chunk: Buffer | string) => body += chunk);
          req.on('end', () => resolve(body));
          req.on('error', reject);
        });
      }

      // Add health check endpoint
      viteServer.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.url === healthPath && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({
            status: 'ok',
            ready: !!cachedRender,
            mode: 'vite-plugin',
          }));
          return;
        }

        next();
      });

      // Add SSR endpoint
      viteServer.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.url !== path) {
          return next();
        }

        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        // Handle preflight
        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.end();
          return;
        }

        // Only allow POST
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        try {
          // Read request body
          const body = await readBody(req);
          const page = JSON.parse(body);

          console.log(`[ssr-plugin] Rendering page: ${page.component}`);

          // Load render function (cached after first load)
          const render = await loadRenderFunction();

          // Render the page
          const result = await render(page);

          // Send response
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            result: result,
          }));

          console.log(`[ssr-plugin] Rendered successfully`);
        } catch (error) {
          console.error('[ssr-plugin] Render error:', error);

          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: false,
            error: {
              message: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            },
          }));
        }
      });

      console.log(`[ssr-plugin] SSR endpoint ready at http://localhost:${viteServer.config.server.port || 5173}${path}`);
      console.log(`[ssr-plugin] Health check at http://localhost:${viteServer.config.server.port || 5173}${healthPath}`);

      // Pre-load the render function
      try {
        await loadRenderFunction();
      } catch (error) {
        console.error('[ssr-plugin] Failed to pre-load SSR entry:', error);
      }
    }
  };
}
