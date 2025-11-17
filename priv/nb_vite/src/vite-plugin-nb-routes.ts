/**
 * Vite plugin for auto-regenerating nb_routes when router.ex changes
 *
 * This plugin watches Phoenix router files and automatically regenerates
 * JavaScript/TypeScript route helpers when changes are detected.
 */

import type { Plugin, ViteDevServer } from 'vite';
import { spawn, type ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface NbRoutesPluginOptions {
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
 * import { defineConfig } from 'vite';
 * import { nbRoutes } from '@nordbeam/nb-vite/nb-routes';
 *
 * export default defineConfig({
 *   plugins: [
 *     nbRoutes({
 *       enabled: true,
 *       verbose: true
 *     })
 *   ]
 * });
 * ```
 */
export function nbRoutes(options: NbRoutesPluginOptions = {}): Plugin {
  const opts = {
    enabled: true,
    routerPath: ['lib/**/*_web/router.ex', 'lib/**/router.ex'],
    debounce: 300,
    verbose: false,
    routesFile: 'assets/js/routes.js',
    command: 'mix nb_routes.gen',
    ...options
  };

  let server: ViteDevServer | null = null;
  let isRegenerating = false;
  let debounceTimer: NodeJS.Timeout | null = null;

  /**
   * Trigger route regeneration
   */
  function regenerateRoutes() {
    if (isRegenerating) {
      if (opts.verbose) {
        console.log('[nb-vite:routes] Regeneration already in progress, skipping...');
      }
      return;
    }

    isRegenerating = true;

    if (opts.verbose) {
      console.log('[nb-vite:routes] Regenerating routes...');
    }

    const [cmd, ...args] = opts.command.split(' ');
    const spawnOptions: import('child_process').SpawnOptions = {
      stdio: 'inherit',
      cwd: opts.cwd || process.cwd(),
      shell: process.platform === 'win32' // Only use shell on Windows for .bat/.cmd files
    };

    const child: ChildProcess = spawn(cmd, args, spawnOptions);

    child.on('close', (code) => {
      isRegenerating = false;

      if (code === 0) {
        if (opts.verbose) {
          console.log('[nb-vite:routes] Routes regenerated successfully');
        }

        // Invalidate the routes module for HMR
        if (server) {
          invalidateRoutesModule(server, opts.routesFile);
        }
      } else {
        console.error('[nb-vite:routes] Route generation failed with code', code);
      }
    });

    child.on('error', (err) => {
      isRegenerating = false;
      console.error('[nb-vite:routes] Error executing route generation:', err);
    });
  }

  /**
   * Debounced route regeneration
   */
  function debouncedRegenerate() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      regenerateRoutes();
      debounceTimer = null;
    }, opts.debounce);
  }

  /**
   * Invalidate the routes module in Vite's module graph
   */
  function invalidateRoutesModule(server: ViteDevServer, routesFile: string) {
    // Try multiple possible paths for the routes file
    const possiblePaths = [
      `/${routesFile}`,
      `/${routesFile.replace(/^assets\//, '')}`,
      path.resolve(routesFile),
      path.resolve('assets', path.basename(routesFile))
    ];

    for (const modulePath of possiblePaths) {
      const module = server.moduleGraph.getModuleById(modulePath);
      if (module) {
        if (opts.verbose) {
          console.log(`[nb-vite:routes] Invalidating module: ${modulePath}`);
        }
        server.moduleGraph.invalidateModule(module);
        server.ws.send({
          type: 'full-reload',
          path: '*'
        });
        return;
      }
    }

    if (opts.verbose) {
      console.log(`[nb-vite:routes] Module not found in graph, triggering full reload`);
    }

    // If module not found, trigger a full reload anyway
    server.ws.send({
      type: 'full-reload',
      path: '*'
    });
  }

  /**
   * Check if a file matches the router pattern
   */
  function matchesRouterPattern(filePath: string): boolean {
    const patterns = Array.isArray(opts.routerPath) ? opts.routerPath : [opts.routerPath];

    return patterns.some(pattern => {
      // Simple glob matching - supports ** and *
      const regex = pattern
        .replace(/\./g, '\\.')
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*');

      return new RegExp(`^${regex}$`).test(filePath);
    });
  }

  return {
    name: 'nb-routes',

    configureServer(devServer: ViteDevServer) {
      if (!opts.enabled) {
        return;
      }

      server = devServer;

      if (opts.verbose) {
        console.log('[nb-vite:routes] Plugin enabled');
        console.log(`[nb-vite:routes] Watching patterns:`, opts.routerPath);
      }

      // Watch for router file changes using Vite's built-in watcher
      devServer.watcher.on('change', (filePath: string) => {
        const relativePath = path.relative(process.cwd(), filePath);

        if (matchesRouterPattern(relativePath)) {
          if (opts.verbose) {
            console.log(`[nb-vite:routes] Detected change: ${relativePath}`);
          }
          debouncedRegenerate();
        }
      });

      // Cleanup on server close
      devServer.httpServer?.once('close', () => {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
      });
    },

    buildStart() {
      if (!opts.enabled) {
        return;
      }

      // Generate routes once at build start
      if (opts.verbose) {
        console.log('[nb-vite:routes] Generating routes for build...');
      }

      regenerateRoutes();
    }
  };
}

export default nbRoutes;
