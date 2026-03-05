import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Vite plugin for nb_inertia colocated page component resolution,
 * .ex file watching, extraction triggering, and HMR.
 *
 * When Page modules use ~TSX sigils, this plugin:
 * 1. Resolves @pages/ imports — checking colocated dir first, then standalone
 * 2. Watches .ex page files for changes and triggers extraction
 * 3. Invalidates the Vite module graph after extraction for HMR
 */
const PLUGIN_NAME = 'nb-inertia';
const LOG_PREFIX = `[nb-vite:inertia]`;
const PAGES_ALIAS = '@pages/';
/**
 * Creates a Vite plugin for nb_inertia colocated page component resolution and HMR.
 *
 * @example
 * ```typescript
 * import { defineConfig } from 'vite';
 * import { nbInertia } from '@nordbeam/nb-vite/nb-inertia';
 *
 * export default defineConfig({
 *   plugins: [
 *     nbInertia({
 *       enabled: true,
 *       verbose: true
 *     })
 *   ]
 * });
 * ```
 */
function nbInertia(options = {}) {
    const opts = {
        enabled: true,
        pagesDir: '../.nb_inertia/pages',
        standaloneDir: 'pages',
        watchPaths: [
            '../lib/**/*_page/**/*.ex',
            '../lib/**/*_page.ex',
        ],
        debounce: 100,
        extractCmd: 'mix nb_inertia.extract',
        extensions: ['.tsx', '.jsx', '.vue'],
        verbose: false,
        ...options,
    };
    if (!opts.enabled) {
        return { name: `${PLUGIN_NAME}-disabled` };
    }
    let server = null;
    let isExtracting = false;
    let debounceTimer = null;
    let resolvedPagesDir = '';
    let resolvedStandaloneDir = '';
    function log(message) {
        if (opts.verbose) {
            console.log(`${LOG_PREFIX} ${message}`);
        }
    }
    /**
     * Resolve a component path by trying colocated first, then standalone.
     * Returns the absolute path to the first matching file, or null.
     */
    function resolvePageComponent(componentPath) {
        for (const ext of opts.extensions) {
            // Try colocated directory first (takes priority)
            const colocatedPath = path.resolve(resolvedPagesDir, `${componentPath}${ext}`);
            if (fs.existsSync(colocatedPath)) {
                log(`Resolved @pages/${componentPath} -> colocated: ${colocatedPath}`);
                return colocatedPath;
            }
            // Fall back to standalone directory
            const standalonePath = path.resolve(resolvedStandaloneDir, `${componentPath}${ext}`);
            if (fs.existsSync(standalonePath)) {
                log(`Resolved @pages/${componentPath} -> standalone: ${standalonePath}`);
                return standalonePath;
            }
        }
        // Also try the path as-is (already has extension)
        const colocatedExact = path.resolve(resolvedPagesDir, componentPath);
        if (fs.existsSync(colocatedExact)) {
            return colocatedExact;
        }
        const standaloneExact = path.resolve(resolvedStandaloneDir, componentPath);
        if (fs.existsSync(standaloneExact)) {
            return standaloneExact;
        }
        return null;
    }
    /**
     * Trigger TSX extraction from .ex page modules.
     */
    function triggerExtraction() {
        if (isExtracting) {
            log('Extraction already in progress, skipping...');
            return;
        }
        isExtracting = true;
        log('Triggering page extraction...');
        if (opts.extractUrl) {
            // HTTP call to extraction GenServer
            fetch(opts.extractUrl, { method: 'POST' })
                .then((res) => {
                isExtracting = false;
                if (res.ok) {
                    log('Extraction via HTTP completed successfully');
                    invalidatePageModules();
                }
                else {
                    console.error(`${LOG_PREFIX} Extraction HTTP request failed with status ${res.status}`);
                }
            })
                .catch((err) => {
                isExtracting = false;
                console.error(`${LOG_PREFIX} Extraction HTTP request failed:`, err.message);
                // Fall back to mix task on HTTP failure
                log('Falling back to mix task extraction...');
                triggerExtractionViaMix();
            });
        }
        else {
            triggerExtractionViaMix();
        }
    }
    /**
     * Run extraction via spawning a mix task.
     */
    function triggerExtractionViaMix() {
        const [cmd, ...args] = opts.extractCmd.split(' ');
        const spawnOptions = {
            stdio: opts.verbose ? 'inherit' : 'pipe',
            cwd: opts.cwd || process.cwd(),
            shell: process.platform === 'win32',
        };
        const child = spawn(cmd, args, spawnOptions);
        child.on('close', (code) => {
            isExtracting = false;
            if (code === 0) {
                log('Extraction completed successfully');
                invalidatePageModules();
            }
            else {
                console.error(`${LOG_PREFIX} Extraction failed with code ${code}`);
            }
        });
        child.on('error', (err) => {
            isExtracting = false;
            console.error(`${LOG_PREFIX} Error executing extraction command:`, err);
        });
    }
    /**
     * Debounced extraction trigger.
     */
    function debouncedExtract() {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(() => {
            triggerExtraction();
            debounceTimer = null;
        }, opts.debounce);
    }
    /**
     * Invalidate page modules in Vite's module graph and trigger HMR.
     *
     * After extraction writes new .tsx files, we need to invalidate
     * the corresponding entries in the module graph so Vite picks up
     * the changes and triggers React Fast Refresh / Vue HMR.
     */
    function invalidatePageModules() {
        if (!server)
            return;
        let invalidatedCount = 0;
        // Walk the colocated pages directory and invalidate any loaded modules
        if (fs.existsSync(resolvedPagesDir)) {
            invalidateDir(resolvedPagesDir);
        }
        if (invalidatedCount > 0) {
            log(`Invalidated ${invalidatedCount} module(s) in graph`);
            // Send HMR update — Vite will handle React Fast Refresh / Vue HMR
            // automatically for the invalidated modules
        }
        else {
            log('No modules to invalidate, triggering full reload');
            server.ws.send({
                type: 'full-reload',
                path: '*',
            });
        }
        function invalidateDir(dir) {
            if (!server)
                return;
            let entries;
            try {
                entries = fs.readdirSync(dir, { withFileTypes: true });
            }
            catch {
                return;
            }
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    invalidateDir(fullPath);
                }
                else if (entry.isFile() && isPageFile(entry.name)) {
                    const module = server.moduleGraph.getModuleById(fullPath);
                    if (module) {
                        server.moduleGraph.invalidateModule(module);
                        invalidatedCount++;
                        log(`Invalidated: ${fullPath}`);
                    }
                }
            }
        }
    }
    /**
     * Check if a filename is a page component file.
     */
    function isPageFile(filename) {
        return opts.extensions.some((ext) => filename.endsWith(ext));
    }
    /**
     * Check if a file path matches any of the watch patterns.
     */
    function matchesWatchPattern(filePath) {
        const patterns = opts.watchPaths;
        return patterns.some((pattern) => {
            // Simple glob matching — supports ** and *
            const regex = pattern
                .replace(/\./g, '\\.')
                .replace(/\*\*/g, '.*')
                .replace(/\*/g, '[^/]*');
            return new RegExp(`^${regex}$`).test(filePath);
        });
    }
    return {
        name: PLUGIN_NAME,
        configResolved(resolvedConfig) {
            // Resolve directories relative to Vite root
            const root = resolvedConfig.root;
            resolvedPagesDir = path.isAbsolute(opts.pagesDir)
                ? opts.pagesDir
                : path.resolve(root, opts.pagesDir);
            resolvedStandaloneDir = path.isAbsolute(opts.standaloneDir)
                ? opts.standaloneDir
                : path.resolve(root, opts.standaloneDir);
            log(`Pages dir (colocated): ${resolvedPagesDir}`);
            log(`Pages dir (standalone): ${resolvedStandaloneDir}`);
        },
        resolveId(id) {
            if (!id.startsWith(PAGES_ALIAS)) {
                return null;
            }
            const componentPath = id.slice(PAGES_ALIAS.length);
            const resolved = resolvePageComponent(componentPath);
            if (resolved) {
                return resolved;
            }
            // Don't error here — let other plugins or Vite handle it
            log(`Could not resolve: ${id}`);
            return null;
        },
        configureServer(devServer) {
            server = devServer;
            log('Plugin enabled');
            log(`Watching patterns: ${JSON.stringify(opts.watchPaths)}`);
            // Watch .ex page files for changes
            devServer.watcher.on('change', (filePath) => {
                if (!filePath.endsWith('.ex'))
                    return;
                const relativePath = path.relative(process.cwd(), filePath);
                if (matchesWatchPattern(relativePath)) {
                    log(`Detected change: ${relativePath}`);
                    debouncedExtract();
                }
            });
            // Also watch the colocated pages directory for direct changes
            // (e.g., if extraction happens externally)
            if (fs.existsSync(resolvedPagesDir)) {
                devServer.watcher.add(resolvedPagesDir);
            }
            // Cleanup on server close
            devServer.httpServer?.once('close', () => {
                if (debounceTimer) {
                    clearTimeout(debounceTimer);
                }
            });
        },
        buildStart() {
            // In production builds, run extraction once before building
            // to ensure all colocated pages are extracted
            if (!server) {
                log('Running extraction for build...');
                triggerExtraction();
            }
        },
    };
}

export { nbInertia as default, nbInertia };
