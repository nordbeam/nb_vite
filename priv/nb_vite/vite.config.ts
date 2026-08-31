import { defineConfig } from 'vite-plus';

/**
 * Build the three public plugin entry points with Vite+'s library pipeline.
 *
 * Vite+ delegates `vp pack` to tsdown, so declarations and dependency
 * handling stay aligned with the same toolchain used by consumers of this
 * package.
 */
export default defineConfig({
  pack: {
    entry: {
      index: './src/index.ts',
      'vite-plugin-nb-routes': './src/vite-plugin-nb-routes.ts',
      'vite-plugin-nb-inertia': './src/vite-plugin-nb-inertia.ts',
    },
    format: ['esm'],
    dts: true,
    clean: true,
    fixedExtension: false,
    copy: './src/dev-server-index.html',
    deps: {
      // The static file-reference build is loaded without npm installing
      // nb_vite's runtime dependencies. Keep these small dependencies in the
      // bundle so `priv/static/nb_vite/index.js` remains standalone.
      alwaysBundle: ['picocolors', 'vite-plugin-full-reload'],
      // Keep Vite and Node built-ins as imports in the GitHub-installed plugin.
      // Vite is a peer dependency and Node built-ins are supplied by the
      // host running the config/plugin.
      neverBundle: ['vite', /^node:/, 'fs', 'path', 'net', 'http', 'child_process'],
    },
  },
});
