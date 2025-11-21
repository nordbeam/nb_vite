import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { AddressInfo } from "node:net";
import { IncomingMessage, ServerResponse } from "node:http";
import {
  Plugin,
  UserConfig,
  ConfigEnv,
  ResolvedConfig,
  Manifest,
  ManifestChunk,
  PluginOption,
  loadEnv,
  SSROptions,
  Rollup,
  ViteDevServer,
} from "vite";
import { OutputChunk } from "rollup";
import colors from "picocolors";
import fullReload, {
  Config as FullReloadConfig,
} from "vite-plugin-full-reload";

// No longer need vite-node imports - using built-in Module Runner API

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
   * The entry point for SSR rendering in development
   * @default './js/ssr_dev.tsx'
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
  config?: FullReloadConfig;
}

interface PhoenixPlugin extends Plugin {
  config: (config: UserConfig, env: ConfigEnv) => UserConfig;
}

type DevServerUrl = `${"http" | "https"}://${string}:${number}`;

let exitHandlersBound = false;

export const refreshPaths = [
  "lib/**/*.ex",
  "lib/**/*.heex",
  "lib/**/*.eex",
  "lib/**/*.leex",
  "lib/**/*.sface",
  "priv/gettext/**/*.po",
].filter((path) => fs.existsSync(path.replace(/\*\*$/, "")));

export default function phoenix(
  config: string | string[] | PluginConfig,
): PluginOption[] {
  const pluginConfig = resolvePluginConfig(config);

  return [
    resolvePhoenixPlugin(pluginConfig),
    ...(resolveFullReloadConfig(pluginConfig) as Plugin[]),
  ];
}

/**
 * Resolve the Phoenix plugin configuration.
 */
function resolvePluginConfig(
  config: string | string[] | PluginConfig,
): Required<PluginConfig> {
  if (typeof config === "undefined") {
    throw new Error(
      "phoenix-vite-plugin: Missing configuration. Please provide an input path or a configuration object.",
    );
  }

  if (typeof config === "string" || Array.isArray(config)) {
    config = { input: config, ssr: config };
  }

  if (typeof config.input === "undefined") {
    throw new Error(
      'phoenix-vite-plugin: Missing configuration for "input". Please specify the entry point(s) for your application.',
    );
  }

  // Validate input paths exist
  const validateInputPath = (inputPath: string) => {
    const resolvedPath = path.resolve(process.cwd(), inputPath);
    if (!fs.existsSync(resolvedPath)) {
      console.warn(
        `[nb-vite] ${colors.yellow("Warning")}: Input file "${inputPath}" does not exist. Make sure to create it before running Vite.`,
      );
    }
  };

  if (typeof config.input === "string") {
    validateInputPath(config.input);
  } else if (Array.isArray(config.input)) {
    config.input.forEach((input) => {
      if (typeof input === "string") {
        validateInputPath(input);
      }
    });
  }

  if (typeof config.publicDirectory === "string") {
    config.publicDirectory = config.publicDirectory.trim().replace(/^\/+/, "");

    if (config.publicDirectory === "") {
      throw new Error(
        "phoenix-vite-plugin: publicDirectory must be a subdirectory. E.g. 'priv/static'. Got empty string after normalization.",
      );
    }

    // Validate public directory exists
    const publicDirPath = path.resolve(process.cwd(), config.publicDirectory);
    if (!fs.existsSync(publicDirPath)) {
      console.warn(
        `[nb-vite] ${colors.yellow("Warning")}: Public directory "${config.publicDirectory}" does not exist. It will be created during build.`,
      );
    }
  }

  if (config.publicDirectory === undefined) {
    config.publicDirectory = "priv/static";
  }

  if (typeof config.buildDirectory === "string") {
    config.buildDirectory = config.buildDirectory
      .trim()
      .replace(/^\/+/, "")
      .replace(/\/+$/, "");

    if (config.buildDirectory === "") {
      throw new Error(
        "phoenix-vite-plugin: buildDirectory must be a subdirectory. E.g. 'assets'. Got empty string after normalization.",
      );
    }
  }

  if (config.buildDirectory === undefined) {
    config.buildDirectory = "assets";
  }

  if (typeof config.ssrOutputDirectory === "string") {
    config.ssrOutputDirectory = config.ssrOutputDirectory
      .trim()
      .replace(/^\/+/, "")
      .replace(/\/+$/, "");

    if (config.ssrOutputDirectory === "") {
      throw new Error(
        "phoenix-vite-plugin: ssrOutputDirectory must be a subdirectory. E.g. 'priv/ssr'. Got empty string after normalization.",
      );
    }
  }

  if (config.ssrOutputDirectory === undefined) {
    config.ssrOutputDirectory = "priv/ssr";
  }

  if (config.hotFile === undefined) {
    config.hotFile = path.join("priv", "hot");
  }

  if (config.manifestPath === undefined) {
    config.manifestPath = path.join(
      config.publicDirectory,
      config.buildDirectory,
      "manifest.json",
    );
  }

  if (config.ssr === undefined) {
    config.ssr = config.input;
  }

  if (config.reactRefresh === undefined) {
    config.reactRefresh = false;
  }

  if (config.refresh === true) {
    config.refresh = [{ paths: refreshPaths }];
  }

  if (config.refresh === undefined) {
    config.refresh = false;
  }

  if (config.detectTls === undefined) {
    config.detectTls = null;
  }

  // Normalize SSR dev config
  if (config.ssrDev === true) {
    config.ssrDev = {};
  } else if (config.ssrDev === undefined || config.ssrDev === false) {
    config.ssrDev = { enabled: false };
  }

  if (typeof config.ssrDev === 'object') {
    const ssrDev = config.ssrDev as SSRConfig;
    if (ssrDev.enabled === undefined) {
      ssrDev.enabled = true;
    }
    if (ssrDev.path === undefined) {
      ssrDev.path = '/ssr';
    }
    if (ssrDev.healthPath === undefined) {
      ssrDev.healthPath = '/ssr-health';
    }
    if (ssrDev.entryPoint === undefined) {
      ssrDev.entryPoint = './js/ssr_dev.tsx';
    }
    if (ssrDev.hotFile === undefined) {
      ssrDev.hotFile = path.join('priv', 'ssr-hot');
    }
    config.ssrDev = ssrDev;
  }

  // Log resolved configuration in verbose mode
  if (process.env.DEBUG || process.env.VERBOSE) {
    console.log(colors.dim("Phoenix Vite Plugin - Resolved Configuration:"));
    console.log(
      colors.dim(
        JSON.stringify(
          {
            publicDirectory: config.publicDirectory,
            buildDirectory: config.buildDirectory,
            hotFile: config.hotFile,
            detectTls: config.detectTls,
          },
          null,
          2,
        ),
      ),
    );
  }

  return {
    input: config.input,
    publicDirectory: config.publicDirectory,
    buildDirectory: config.buildDirectory,
    ssr: config.ssr,
    ssrOutputDirectory: config.ssrOutputDirectory,
    ssrDev: config.ssrDev as Required<SSRConfig>,
    refresh: config.refresh,
    hotFile: config.hotFile,
    manifestPath: config.manifestPath,
    reactRefresh: config.reactRefresh,
    detectTls: config.detectTls,
    transformOnServe: config.transformOnServe ?? ((code) => code),
  };
}

/**
 * Setup SSR endpoint in the Vite dev server using Module Runner API
 */
async function setupSSREndpoint(
  viteServer: ViteDevServer,
  ssrConfig: Required<SSRConfig>
): Promise<{ cleanup: () => void } | null> {
  console.log('[nb-vite:ssr] Initializing SSR endpoint with Module Runner...');

  // Get the SSR environment and create/access its runner
  // The runner provides module execution with automatic source map support
  const ssrEnvironment = viteServer.environments.ssr;
  // @ts-ignore - runner property exists in Vite 6+ but may not be typed yet
  const runner = ssrEnvironment.runner || (await ssrEnvironment.createModuleRunner());

  let cachedRender: ((page: unknown) => Promise<unknown>) | null = null;

  // Watch for file changes and invalidate cache
  viteServer.watcher.on('change', async (file: string) => {
    const jsDir = path.resolve(viteServer.config.root, "./js");
    if (!file.startsWith(jsDir) || !file.match(/\.(tsx?|jsx?)$/)) {
      return;
    }

    // Skip auto-generated files that don't affect SSR
    const fileName = file.split('/').pop() || '';
    if (fileName === 'routes.js' || fileName === 'routes.d.ts') {
      console.log(`[nb-vite:ssr] Skipping SSR cache invalidation for: ${file.replace(viteServer.config.root, '')}`);
      return;
    }

    console.log(`[nb-vite:ssr] File changed: ${file.replace(viteServer.config.root, '')}`);

    // Invalidate the changed module in the module graph
    const mods = await viteServer.moduleGraph.getModulesByFile(file);
    if (mods) {
      for (const mod of mods) {
        await viteServer.moduleGraph.invalidateModule(mod);
      }
    }

    // Clear the module runner cache
    runner.clearCache();
    cachedRender = null;

    console.log('[nb-vite:ssr] Cache invalidated - will reload on next request');
  });

  // Load the render function
  async function loadRenderFunction(): Promise<(page: unknown) => Promise<unknown>> {
    if (!cachedRender) {
      const ssrEntryPath = path.resolve(viteServer.config.root, ssrConfig.entryPoint!);
      console.log(`[nb-vite:ssr] Loading SSR entry: ${ssrEntryPath}`);

      // Invalidate module graph for fresh reload
      const mods = await viteServer.moduleGraph.getModulesByFile(ssrEntryPath);
      if (mods) {
        for (const mod of mods) {
          await viteServer.moduleGraph.invalidateModule(mod);
        }
      }

      // Clear the module runner cache
      runner.clearCache();

      // Import the module using Module Runner API
      // This automatically handles:
      // - Source map support
      // - Module execution in SSR context
      // - Proper module resolution
      const ssrModule = await runner.import(ssrEntryPath) as { render?: (page: unknown) => Promise<unknown> };

      if (!ssrModule.render || typeof ssrModule.render !== 'function') {
        throw new Error('SSR entry must export a "render" function');
      }

      cachedRender = ssrModule.render;
      console.log('[nb-vite:ssr] SSR render function loaded successfully');
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
    if (req.url === ssrConfig.healthPath && req.method === 'GET') {
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
    if (req.url !== ssrConfig.path) {
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

      console.log(`[nb-vite:ssr] Rendering page: ${page.component}`);

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

      console.log(`[nb-vite:ssr] Rendered successfully`);
    } catch (error) {
      console.error('[nb-vite:ssr] Render error:', error);

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

  console.log(`[nb-vite:ssr] SSR endpoint ready at http://localhost:${viteServer.config.server.port || 5173}${ssrConfig.path}`);
  console.log(`[nb-vite:ssr] Health check at http://localhost:${viteServer.config.server.port || 5173}${ssrConfig.healthPath}`);

  // Pre-load the render function
  try {
    await loadRenderFunction();
  } catch (error) {
    console.error('[nb-vite:ssr] Failed to pre-load SSR entry:', error);
  }

  return {
    cleanup: () => {
      // Cleanup if needed
    }
  };
}

/**
 * Resolve the Phoenix plugin.
 */
function resolvePhoenixPlugin(
  pluginConfig: Required<PluginConfig>,
): PhoenixPlugin {
  let viteDevServerUrl: DevServerUrl;
  let resolvedConfig: ResolvedConfig;
  let userConfig: UserConfig;

  const defaultAliases: Record<string, string> = {
    "@": path.resolve(process.cwd(), "assets/js"),
  };

  // Resolve Phoenix JS library aliases
  const phoenixAliases = resolvePhoenixJSAliases();

  // Resolve Phoenix colocated hooks aliases (for Phoenix 1.8)
  const colocatedAliases = resolvePhoenixColocatedAliases();

  return {
    name: "phoenix",
    enforce: "post",
    config: (config, env) => {
      userConfig = config;
      const ssr = !!userConfig.build?.ssr;
      const environment = loadEnv(
        env.mode,
        userConfig.envDir || process.cwd(),
        "",
      );
      const assetUrl = environment.ASSET_URL ?? "assets";
      const serverConfig =
        env.command === "serve"
          ? (resolveDevelopmentEnvironmentServerConfig(
              pluginConfig.detectTls,
              environment,
            ) ?? resolveEnvironmentServerConfig(environment))
          : undefined;

      ensureCommandShouldRunInEnvironment(env.command, environment);

      // Warn about common configuration issues
      if (env.command === "serve") {
        checkCommonConfigurationIssues(pluginConfig, environment, userConfig);
      }

      return {
        base:
          userConfig.base ??
          (env.command === "build" ? resolveBase(pluginConfig, assetUrl) : ""),
        publicDir: userConfig.publicDir ?? false,
        build: {
          manifest: userConfig.build?.manifest ?? (ssr ? false : true),
          ssrManifest:
            userConfig.build?.ssrManifest ??
            (ssr ? "ssr-manifest.json" : false),
          outDir: userConfig.build?.outDir ?? resolveOutDir(pluginConfig, ssr),
          assetsDir: userConfig.build?.assetsDir ?? (ssr ? "" : "."),
          emptyOutDir: false,
          rollupOptions: {
            input:
              userConfig.build?.rollupOptions?.input ??
              resolveInput(pluginConfig, ssr),
          },
          assetsInlineLimit: userConfig.build?.assetsInlineLimit ?? 0,
        },
        resolve: {
          alias: Array.isArray(userConfig?.resolve?.alias)
            ? [
                ...(userConfig.resolve.alias as Array<{
                  find: string;
                  replacement: string;
                }>),
                ...Object.entries(defaultAliases).map(
                  ([find, replacement]) => ({ find, replacement }),
                ),
                ...Object.entries(phoenixAliases).map(
                  ([find, replacement]) => ({ find, replacement }),
                ),
                ...Object.entries(colocatedAliases).map(
                  ([find, replacement]) => ({ find, replacement }),
                ),
              ]
            : {
                ...defaultAliases,
                ...phoenixAliases,
                ...colocatedAliases,
                ...(userConfig?.resolve?.alias as Record<string, string>),
              },
        },
        ssr: {
          noExternal: noExternalInertiaHelpers(userConfig),
        },
        optimizeDeps: {
          entries: Array.isArray(pluginConfig.input)
            ? pluginConfig.input.filter(
                (entry): entry is string => typeof entry === "string",
              )
            : typeof pluginConfig.input === "string"
              ? [pluginConfig.input]
              : undefined,
          include: [
            "phoenix",
            "phoenix_html",
            "phoenix_live_view",
            ...(userConfig?.optimizeDeps?.include || []),
          ],
        },
        server: {
          origin:
            userConfig?.server?.origin ?? "http://__nb_vite_placeholder__.test",
          cors: userConfig?.server?.cors ?? {
            origin: userConfig?.server?.origin ?? [
              // Default patterns for localhost (IPv4, IPv6)
              /^https?:\/\/(?:(?:[^:]+\.)?localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/, // Copied from Vite itself
              // Phoenix app URL from environment
              ...(environment.PHX_HOST
                ? [
                    environment.PHX_HOST.startsWith("http://") ||
                    environment.PHX_HOST.startsWith("https://")
                      ? environment.PHX_HOST
                      : `http://${environment.PHX_HOST}`,
                  ]
                : []),
              // Common local development patterns
              /^https?:\/\/.*\.test(?::\d+)?$/, // *.test domains (common for local dev)
              /^https?:\/\/.*\.local(?::\d+)?$/, // *.local domains
              /^https?:\/\/.*\.localhost(?::\d+)?$/, // *.localhost subdomains
            ],
          },
          // Handle Docker/container environments
          ...(environment.PHOENIX_DOCKER || environment.DOCKER_ENV
            ? {
                host: userConfig?.server?.host ?? "0.0.0.0",
                port:
                  userConfig?.server?.port ??
                  (environment.VITE_PORT
                    ? parseInt(environment.VITE_PORT)
                    : 5173),
                strictPort: userConfig?.server?.strictPort ?? true,
              }
            : undefined),
          ...(serverConfig
            ? {
                host: userConfig?.server?.host ?? serverConfig.host,
                hmr:
                  userConfig?.server?.hmr === false
                    ? false
                    : {
                        ...serverConfig.hmr,
                        ...(userConfig?.server?.hmr === true
                          ? {}
                          : userConfig?.server?.hmr),
                      },
                https: userConfig?.server?.https ?? serverConfig.https,
              }
            : {
                hmr:
                  userConfig?.server?.hmr === false
                    ? false
                    : {
                        ...(typeof userConfig?.server?.hmr === "object"
                          ? userConfig.server.hmr
                          : {}),
                      },
              }),
        },
      };
    },
    configResolved(config) {
      resolvedConfig = config;
    },
    transform(code) {
      if (resolvedConfig.command === "serve") {
        code = code.replace(
          /http:\/\/__nb_vite_placeholder__\.test/g,
          viteDevServerUrl,
        );

        if (pluginConfig.transformOnServe) {
          return pluginConfig.transformOnServe(code, viteDevServerUrl);
        }
      }

      return code;
    },
    async configureServer(server) {
      const envDir = server.config.envDir || process.cwd();
      const phxHost =
        loadEnv(server.config.mode, envDir, "PHX_HOST").PHX_HOST ?? "localhost:4000";

      // Setup SSR if enabled
      const ssrSetup =
        typeof pluginConfig.ssrDev === 'object' && pluginConfig.ssrDev.enabled
          ? await setupSSREndpoint(server, pluginConfig.ssrDev as Required<SSRConfig>)
          : null;

      server.httpServer?.once("listening", () => {
        const address = server.httpServer?.address();

        const isAddressInfo = (
          x: string | AddressInfo | null | undefined,
        ): x is AddressInfo => typeof x === "object";
        if (isAddressInfo(address)) {
          // Support empty string origin for relative URLs (works with reverse proxies)
          viteDevServerUrl = userConfig.server?.origin !== undefined
            ? (userConfig.server.origin as DevServerUrl)
            : resolveDevServerUrl(address, server.config, userConfig);

          // Write hot file with error handling
          try {
            const hotContent = `${viteDevServerUrl}${server.config.base.replace(/\/$/, "")}`;
            const hotDir = path.dirname(pluginConfig.hotFile);

            if (!fs.existsSync(hotDir)) {
              fs.mkdirSync(hotDir, { recursive: true });
            }

            fs.writeFileSync(pluginConfig.hotFile, hotContent);

            if (process.env.DEBUG || process.env.VERBOSE) {
              console.log(
                colors.dim(`Hot file written to: ${pluginConfig.hotFile}`),
              );
            }

            // Write SSR hot file if SSR is enabled
            if (typeof pluginConfig.ssrDev === 'object' && pluginConfig.ssrDev.enabled && pluginConfig.ssrDev.hotFile) {
              try {
                const ssrUrl = `${viteDevServerUrl}${server.config.base.replace(/\/$/, "")}${pluginConfig.ssrDev.path}`;
                const ssrHotDir = path.dirname(pluginConfig.ssrDev.hotFile);

                if (!fs.existsSync(ssrHotDir)) {
                  fs.mkdirSync(ssrHotDir, { recursive: true });
                }

                fs.writeFileSync(pluginConfig.ssrDev.hotFile, ssrUrl);

                if (process.env.DEBUG || process.env.VERBOSE) {
                  console.log(
                    colors.dim(`SSR hot file written to: ${pluginConfig.ssrDev.hotFile}`),
                  );
                }
              } catch (error) {
                console.error(
                  `
[nb-vite] ${colors.red("Error")}: Failed to write SSR hot file.\n` +
                    `Path: ${typeof pluginConfig.ssrDev === 'object' ? pluginConfig.ssrDev.hotFile : 'unknown'}\n` +
                    `Error: ${error instanceof Error ? error.message : String(error)}\n`,
                );
              }
            }
          } catch (error) {
            console.error(
              `
[nb-vite] ${colors.red("Error")}: Failed to write hot file.\n` +
                `Path: ${pluginConfig.hotFile}\n` +
                `Error: ${error instanceof Error ? error.message : String(error)}\n` +
                `This may prevent Phoenix from detecting the Vite dev server.\n`,
            );
          }

          setTimeout(() => {
            const phoenixVer = phoenixVersion();
            const pluginVer = pluginVersion();

            server.config.logger.info(
              `\n  ${colors.red(`${colors.bold("PHOENIX")} ${phoenixVer !== "unknown" ? phoenixVer : ""}`)}  ${colors.dim("plugin")} ${colors.bold(`v${pluginVer}`)}`,
            );
            server.config.logger.info("");
            server.config.logger.info(
              `  ${colors.green("➜")}  ${colors.bold("PHX_HOST")}: ${colors.cyan(phxHost.replace(/:(\d+)/, (_, port) => `:${colors.bold(port)}`))}`,
            );

            if (
              typeof resolvedConfig.server.https === "object" &&
              typeof resolvedConfig.server.https.key === "string"
            ) {
              // Log certificate source with detailed info
              if (pluginConfig.detectTls) {
                if (resolvedConfig.server.https.key.includes("mkcert")) {
                  server.config.logger.info(
                    `  ${colors.green("➜")}  Using mkcert certificate to secure Vite.`,
                  );
                } else if (resolvedConfig.server.https.key.includes("caddy")) {
                  server.config.logger.info(
                    `  ${colors.green("➜")}  Using Caddy certificate to secure Vite.`,
                  );
                } else if (
                  resolvedConfig.server.https.key.includes("priv/cert")
                ) {
                  server.config.logger.info(
                    `  ${colors.green("➜")}  Using project certificate to secure Vite.`,
                  );
                } else {
                  server.config.logger.info(
                    `  ${colors.green("➜")}  Using custom certificate to secure Vite.`,
                  );
                }
              } else {
                server.config.logger.info(
                  `  ${colors.green("➜")}  Using TLS certificate to secure Vite.`,
                );
              }
            }

            // Add hot reload paths info if refresh is enabled
            if (pluginConfig.refresh !== false) {
              const refreshCount = Array.isArray(pluginConfig.refresh)
                ? (pluginConfig.refresh as RefreshConfig[]).reduce(
                    (acc, cfg) => acc + cfg.paths.length,
                    0,
                  )
                : 0;
              if (refreshCount > 0) {
                server.config.logger.info(
                  `  ${colors.green("➜")}  Full reload enabled for ${refreshCount} file pattern(s)`,
                );
              }
            }

            // Log the development server URL last
            server.config.logger.info("");
            server.config.logger.info(
              `  ${colors.green("➜")}  ${colors.bold("Dev Server")}: ${colors.cyan(viteDevServerUrl.replace(/:(\d+)/, (_, port: string) => `:${colors.bold(port)}`))}\n`,
            );
          }, 100);
        }
      });

      if (!exitHandlersBound) {
        const clean = () => {
          if (fs.existsSync(pluginConfig.hotFile)) {
            try {
              fs.rmSync(pluginConfig.hotFile);
              if (process.env.DEBUG || process.env.VERBOSE) {
                console.log(
                  colors.dim(`Hot file cleaned up: ${pluginConfig.hotFile}`),
                );
              }
            } catch (error) {
              // Ignore cleanup errors - the file might already be deleted
              if (process.env.DEBUG || process.env.VERBOSE) {
                console.log(
                  colors.dim(
                    `Could not clean up hot file: ${error instanceof Error ? error.message : String(error)}`,
                  ),
                );
              }
            }
          }

          // Clean up SSR hot file if it exists
          if (typeof pluginConfig.ssrDev === 'object' && pluginConfig.ssrDev.hotFile && fs.existsSync(pluginConfig.ssrDev.hotFile)) {
            try {
              fs.rmSync(pluginConfig.ssrDev.hotFile);
              if (process.env.DEBUG || process.env.VERBOSE) {
                console.log(
                  colors.dim(`SSR hot file cleaned up: ${pluginConfig.ssrDev.hotFile}`),
                );
              }
            } catch (error) {
              if (process.env.DEBUG || process.env.VERBOSE) {
                console.log(
                  colors.dim(
                    `Could not clean up SSR hot file: ${error instanceof Error ? error.message : String(error)}`,
                  ),
                );
              }
            }
          }
        };

        process.on("exit", clean);
        process.on("SIGINT", () => {
          console.log(colors.dim("\nShutting down Vite..."));
          process.exit();
        });
        process.on("SIGTERM", () => process.exit());
        process.on("SIGHUP", () => process.exit());

        // Terminate the watcher when Phoenix quits
        process.stdin.on("close", () => {
          if (process.env.DEBUG || process.env.VERBOSE) {
            console.log(
              colors.dim("Phoenix process closed, shutting down Vite..."),
            );
          }
          process.exit(0);
        });
        process.stdin.resume();

        exitHandlersBound = true;
      }

      return () =>
        server.middlewares.use((req, res, next) => {
          if (req.url === "/index.html") {
            res.statusCode = 404;

            res.end(
              fs
                .readFileSync(
                  new URL("./dev-server-index.html", import.meta.url),
                )
                .toString()
                .replace(/{{ PHOENIX_VERSION }}/g, phoenixVersion()),
            );
          }

          next();
        });
    },
    writeBundle() {
      // Only generate manifest for non-SSR builds
      // Use writeBundle instead of generateBundle so we can read Vite's generated manifest
      if (!resolvedConfig.build.ssr) {
        try {
          // Read Vite's generated manifest
          const viteManifestPath = path.join(
            resolvedConfig.build.outDir,
            ".vite",
            "manifest.json"
          );

          if (!fs.existsSync(viteManifestPath)) {
            console.warn(
              `
[nb-vite] ${colors.yellow("Warning")}: Vite manifest not found at ${viteManifestPath}\n`
            );
            return;
          }

          const viteManifest = JSON.parse(
            fs.readFileSync(viteManifestPath, "utf-8")
          ) as Manifest;

          // Transform Vite's manifest to add the buildDirectory prefix to file paths
          const manifest = {} as Manifest;

          for (const [key, entry] of Object.entries(viteManifest)) {
            const transformedEntry = { ...entry };

            // Add buildDirectory prefix to file path
            if (entry.file) {
              transformedEntry.file = `${pluginConfig.buildDirectory}/${entry.file}`;
            }

            // Transform CSS array
            if (entry.css && Array.isArray(entry.css)) {
              transformedEntry.css = entry.css.map(
                (css) => `${pluginConfig.buildDirectory}/${css}`
              );
            }

            // Transform assets array
            if (entry.assets && Array.isArray(entry.assets)) {
              transformedEntry.assets = entry.assets.map(
                (asset) => `${pluginConfig.buildDirectory}/${asset}`
              );
            }

            manifest[key] = transformedEntry;
          }

          const manifestContent = JSON.stringify(manifest, null, 2);
          const manifestDir = path.dirname(pluginConfig.manifestPath);

          // Ensure manifest directory exists
          if (!fs.existsSync(manifestDir)) {
            if (process.env.DEBUG || process.env.VERBOSE) {
              console.log(
                colors.dim(`Creating manifest directory: ${manifestDir}`),
              );
            }
            fs.mkdirSync(manifestDir, { recursive: true });
          }

          fs.writeFileSync(pluginConfig.manifestPath, manifestContent);

          if (process.env.DEBUG || process.env.VERBOSE) {
            console.log(
              colors.dim(`Manifest written to: ${pluginConfig.manifestPath}`),
            );
            console.log(
              colors.dim(`Manifest entries: ${Object.keys(manifest).length}`),
            );
          }
        } catch (error) {
          console.error(
            `
[nb-vite] ${colors.red("Error")}: Failed to generate manifest file.\n` +
              `Path: ${pluginConfig.manifestPath}\n` +
              `Error: ${error instanceof Error ? error.message : String(error)}\n`,
          );
          throw error;
        }
      }
    },
  };
}

/**
 * Check for common configuration issues and warn the user.
 */
function checkCommonConfigurationIssues(
  pluginConfig: Required<PluginConfig>,
  env: Record<string, string>,
  userConfig: UserConfig,
): void {
  // Check if PHX_HOST is not set
  if (!env.PHX_HOST) {
    console.warn(
      `
[nb-vite] ${colors.yellow("Warning")}: PHX_HOST environment variable is not set.\n` +
        `This may cause CORS issues when accessing your Phoenix app.\n` +
        `Set it in your .env file or shell: export PHX_HOST=localhost:4000\n`,
    );
  }

  // Check for potential port conflicts
  const vitePort =
    userConfig.server?.port ?? (env.VITE_PORT ? parseInt(env.VITE_PORT) : 5173);
  if (env.PHX_HOST && env.PHX_HOST.includes(`:${vitePort}`)) {
    console.warn(
      `
[nb-vite] ${colors.yellow("Warning")}: PHX_HOST (${env.PHX_HOST}) is using the same port as Vite (${vitePort}).\n` +
        `This will cause conflicts. Phoenix and Vite must run on different ports.\n`,
    );
  }

  // Check if running in WSL without proper host configuration
  if (
    process.platform === "linux" &&
    env.WSL_DISTRO_NAME &&
    !userConfig.server?.host
  ) {
    console.warn(
      `
[nb-vite] ${colors.yellow("Warning")}: Running in WSL without explicit host configuration.\n` +
        `You may need to set server.host to '0.0.0.0' in your vite.config.js for proper access from Windows.\n`,
    );
  }

  // Check for missing Phoenix dependencies
  const depsPath = path.resolve(process.cwd(), "../deps");
  if (!fs.existsSync(depsPath)) {
    console.warn(
      `
[nb-vite] ${colors.yellow("Warning")}: Phoenix deps directory not found at ${depsPath}.\n` +
        `Make sure you're running Vite from the correct directory (usually the 'assets' folder).\n` +
        `If you're building in Docker, ensure the deps are available at build time.\n`,
    );
  }

  // Check for critical node_modules that might cause config loading to fail
  const nodeModulesPath = path.resolve(process.cwd(), "node_modules");
  if (!fs.existsSync(nodeModulesPath)) {
    console.error(
      `
[nb-vite] ${colors.red("Error")}: node_modules directory not found.\n` +
        `Run 'npm install' (or yarn/pnpm/bun install) before building.\n` +
        `If you're building in Docker, ensure dependencies are installed in your Dockerfile before running the build.\n`,
    );
  } else {
    // Check for critical Vite dependency
    const vitePath = path.resolve(nodeModulesPath, "vite");
    if (!fs.existsSync(vitePath)) {
      console.error(
        `
[nb-vite] ${colors.red("Error")}: Vite is not installed in node_modules.\n` +
          `Run 'npm install vite' to install it.\n` +
          `If you're using a workspace setup in Docker, ensure all dependencies are properly hoisted.\n`,
      );
    }
  }

  // Warn if hot file directory doesn't exist
  const hotFileDir = path.dirname(pluginConfig.hotFile);
  if (!fs.existsSync(hotFileDir)) {
    console.warn(
      `
[nb-vite] ${colors.yellow("Warning")}: Hot file directory "${hotFileDir}" does not exist.\n` +
        `Creating directory to prevent errors...\n`,
    );
    fs.mkdirSync(hotFileDir, { recursive: true });
  }

  // Check for React configuration issues
  if (
    pluginConfig.reactRefresh &&
    !userConfig.plugins?.some(
      (p) =>
        typeof p === "object" &&
        p !== null &&
        "name" in p &&
        p.name === "@vitejs/plugin-react",
    )
  ) {
    console.warn(
      `
[nb-vite] ${colors.yellow("Warning")}: reactRefresh is enabled but @vitejs/plugin-react is not detected.\n` +
        `Install and configure @vitejs/plugin-react for React refresh to work properly.\n`,
    );
  }

  // Warn about SSL in non-development environments
  if (
    env.MIX_ENV &&
    env.MIX_ENV !== "dev" &&
    (pluginConfig.detectTls || env.VITE_DEV_SERVER_KEY)
  ) {
    console.warn(
      `
[nb-vite] ${colors.yellow("Warning")}: TLS/SSL is configured but MIX_ENV is set to "${env.MIX_ENV}".\n` +
        `TLS is typically only needed in development. Consider disabling it for other environments.\n`,
    );
  }
}

/**
 * Validate the command can run in the given environment.
 */
function ensureCommandShouldRunInEnvironment(
  command: "build" | "serve",
  env: Record<string, string>,
): void {
  if (command === "build" || env.PHOENIX_BYPASS_ENV_CHECK === "1") {
    return;
  }

  // Check for CI environments
  if (typeof env.CI !== "undefined") {
    throw new Error(
      "You should not run the Vite HMR server in CI environments. You should build your assets for production instead. To disable this ENV check you may set PHOENIX_BYPASS_ENV_CHECK=1",
    );
  }

  // Check for production deployment indicators
  if (env.MIX_ENV === "prod" || env.NODE_ENV === "production") {
    throw new Error(
      "You should not run the Vite HMR server in production. You should build your assets for production instead. To disable this ENV check you may set PHOENIX_BYPASS_ENV_CHECK=1",
    );
  }

  // Check for Fly.io deployment
  if (typeof env.FLY_APP_NAME !== "undefined") {
    throw new Error(
      "You should not run the Vite HMR server on Fly.io. You should build your assets for production instead. To disable this ENV check you may set PHOENIX_BYPASS_ENV_CHECK=1",
    );
  }

  // Check for Gigalixir deployment
  if (typeof env.GIGALIXIR_APP_NAME !== "undefined") {
    throw new Error(
      "You should not run the Vite HMR server on Gigalixir. You should build your assets for production instead. To disable this ENV check you may set PHOENIX_BYPASS_ENV_CHECK=1",
    );
  }

  // Check for Heroku deployment
  if (
    typeof env.DYNO !== "undefined" &&
    typeof env.HEROKU_APP_NAME !== "undefined"
  ) {
    throw new Error(
      "You should not run the Vite HMR server on Heroku. You should build your assets for production instead. To disable this ENV check you may set PHOENIX_BYPASS_ENV_CHECK=1",
    );
  }

  // Check for Render deployment
  if (typeof env.RENDER !== "undefined") {
    throw new Error(
      "You should not run the Vite HMR server on Render. You should build your assets for production instead. To disable this ENV check you may set PHOENIX_BYPASS_ENV_CHECK=1",
    );
  }

  // Check for Railway deployment
  if (typeof env.RAILWAY_ENVIRONMENT !== "undefined") {
    throw new Error(
      "You should not run the Vite HMR server on Railway. You should build your assets for production instead. To disable this ENV check you may set PHOENIX_BYPASS_ENV_CHECK=1",
    );
  }

  // Check for running in ExUnit tests
  if (
    env.MIX_ENV === "test" &&
    typeof env.PHOENIX_INTEGRATION_TEST === "undefined"
  ) {
    throw new Error(
      "You should not run the Vite HMR server in the test environment. You should build your assets for production instead. To disable this ENV check you may set PHOENIX_BYPASS_ENV_CHECK=1 or PHOENIX_INTEGRATION_TEST=1 for integration tests that need the dev server.",
    );
  }

  // Check for Docker production environments
  if (
    typeof env.DOCKER_ENV !== "undefined" &&
    env.DOCKER_ENV === "production"
  ) {
    throw new Error(
      "You should not run the Vite HMR server in production Docker containers. You should build your assets for production instead. To disable this ENV check you may set PHOENIX_BYPASS_ENV_CHECK=1",
    );
  }

  // Check for release mode
  if (
    typeof env.RELEASE_NAME !== "undefined" ||
    typeof env.RELEASE_NODE !== "undefined"
  ) {
    throw new Error(
      "You should not run the Vite HMR server in an Elixir release. You should build your assets for production instead. To disable this ENV check you may set PHOENIX_BYPASS_ENV_CHECK=1",
    );
  }
}

function toPhoenixAssetPath(filename: string) {
  filename = path.relative(process.cwd(), filename);

  if (filename.startsWith("assets/")) {
    filename = filename.slice("assets/".length);
  }

  return filename;
}

/**
 * The version of Phoenix being run.
 */
function phoenixVersion(): string {
  try {
    // Try to find mix.exs in common locations
    const possiblePaths = [
      path.join(process.cwd(), "mix.exs"),
      path.join(process.cwd(), "../mix.exs"),
      path.join(process.cwd(), "../../mix.exs"),
    ];

    for (const mixExsPath of possiblePaths) {
      if (fs.existsSync(mixExsPath)) {
        const content = fs.readFileSync(mixExsPath, "utf-8");
        // Look for app version
        const versionMatch = content.match(/version:\s*"([^"]+)"/);
        if (versionMatch) {
          return versionMatch[1];
        }
        // Look for Phoenix dependency version
        const phoenixMatch = content.match(/{:phoenix,\s*"~>\s*([^"]+)"/);
        if (phoenixMatch) {
          return `~${phoenixMatch[1]}`;
        }
      }
    }
  } catch (error) {
    if (process.env.DEBUG || process.env.VERBOSE) {
      console.log(
        colors.dim(
          `Could not read Phoenix version: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  return "unknown";
}

/**
 * The version of the Phoenix Vite plugin being run.
 */
function pluginVersion(): string {
  try {
    const currentDir = path.dirname(new URL(import.meta.url).pathname);
    // Try different paths to find package.json
    const possiblePaths = [
      path.join(currentDir, "package.json"),      // When running from priv/static/nb_vite/ (distributed)
      path.join(currentDir, "../package.json"),   // When running from dist/ (during build)
      path.join(currentDir, "../../package.json"), // When running from src/ (development)
    ];

    for (const packageJsonPath of possiblePaths) {
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath).toString(),
        ) as { version?: string };
        return packageJson.version || "unknown";
      }
    }
  } catch {
    // Ignore errors
  }
  return "unknown";
}

function resolveFullReloadConfig({
  refresh: config,
}: Required<PluginConfig>): PluginOption[] {
  if (typeof config === "boolean") {
    return [];
  }

  if (typeof config === "string") {
    config = [{ paths: [config] }];
  }

  if (!Array.isArray(config)) {
    config = [config];
  }

  if (config.some((c) => typeof c === "string")) {
    config = [{ paths: config }] as RefreshConfig[];
  }

  return (config as RefreshConfig[]).flatMap((c) => {
    const plugin = fullReload(c.paths, c.config);

    /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
    /** @ts-ignore */
    plugin.__phoenix_plugin_config = c;

    return plugin;
  });
}

/**
 * Resolve the server config from the environment.
 */
function resolveEnvironmentServerConfig(env: Record<string, string>):
  | {
      hmr?: { host: string };
      host?: string;
      https?: { cert: Buffer; key: Buffer };
    }
  | undefined {
  if (!env.VITE_DEV_SERVER_KEY && !env.VITE_DEV_SERVER_CERT) {
    return;
  }

  // Check if only one certificate path is provided
  if (!env.VITE_DEV_SERVER_KEY || !env.VITE_DEV_SERVER_CERT) {
    throw new Error(
      `Phoenix Vite Plugin: Both VITE_DEV_SERVER_KEY and VITE_DEV_SERVER_CERT must be provided. ` +
        `Currently provided: KEY=${env.VITE_DEV_SERVER_KEY ? "✓" : "✗"}, CERT=${env.VITE_DEV_SERVER_CERT ? "✓" : "✗"}`,
    );
  }

  // Validate certificate files exist
  const missingFiles: string[] = [];
  if (!fs.existsSync(env.VITE_DEV_SERVER_KEY)) {
    missingFiles.push(`Key file not found: ${env.VITE_DEV_SERVER_KEY}`);
  }
  if (!fs.existsSync(env.VITE_DEV_SERVER_CERT)) {
    missingFiles.push(
      `Certificate file not found: ${env.VITE_DEV_SERVER_CERT}`,
    );
  }

  if (missingFiles.length > 0) {
    throw new Error(
      `Phoenix Vite Plugin: Unable to find the certificate files specified in your environment.\n` +
        missingFiles.join("\n") +
        "\n" +
        `Please ensure the paths are correct and the files exist.`,
    );
  }

  const host = resolveHostFromEnv(env);

  if (!host) {
    throw new Error(
      `Phoenix Vite Plugin: Unable to determine the host from the environment.\n` +
        `PHX_HOST is set to: ${env.PHX_HOST ? `"${env.PHX_HOST}"` : "(not set)"}\n` +
        `Please set PHX_HOST to a valid hostname or URL (e.g., "localhost", "myapp.test", or "https://myapp.test").`,
    );
  }

  return {
    hmr: { host },
    host,
    https: {
      key: fs.readFileSync(env.VITE_DEV_SERVER_KEY),
      cert: fs.readFileSync(env.VITE_DEV_SERVER_CERT),
    },
  };
}

/**
 * Resolve the host name from the environment.
 */
function resolveHostFromEnv(env: Record<string, string>): string | undefined {
  // Phoenix apps typically use PHX_HOST for the hostname
  if (env.PHX_HOST) {
    try {
      // If PHX_HOST contains a full URL, extract the host
      if (
        env.PHX_HOST.startsWith("http://") ||
        env.PHX_HOST.startsWith("https://")
      ) {
        return new URL(env.PHX_HOST).host;
      }
      // Otherwise, use it as is
      return env.PHX_HOST;
    } catch {
      return;
    }
  }
  return;
}

/**
 * Resolve the dev server URL from the server address and configuration.
 */
function resolveDevServerUrl(
  address: AddressInfo,
  config: ResolvedConfig,
  userConfig: UserConfig,
): DevServerUrl {
  const configHmrProtocol =
    typeof config.server.hmr === "object" ? config.server.hmr.protocol : null;
  const clientProtocol = configHmrProtocol
    ? configHmrProtocol === "wss"
      ? "https"
      : "http"
    : null;
  const serverProtocol = config.server.https ? "https" : "http";
  const protocol = clientProtocol ?? serverProtocol;

  const configHmrHost =
    typeof config.server.hmr === "object" ? config.server.hmr.host : null;
  const configHost =
    typeof config.server.host === "string" ? config.server.host : null;
  const dockerHost =
    process.env.PHOENIX_DOCKER && !userConfig.server?.host ? "localhost" : null;
  const serverAddress = isIpv6(address)
    ? `[${address.address}]`
    : address.address;
  const host = configHmrHost ?? dockerHost ?? configHost ?? serverAddress;

  const configHmrClientPort =
    typeof config.server.hmr === "object" ? config.server.hmr.clientPort : null;
  const port = configHmrClientPort ?? address.port;

  return `${protocol}://${host}:${port}`;
}

function isIpv6(address: AddressInfo): boolean {
  return (
    address.family === "IPv6" ||
    // In node >=18.0 <18.4 this was an integer value. This was changed in a minor version.
    // See: https://github.com/laravel/vite-plugin/issues/103
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore-next-line
    address.family === 6
  );
}

/**
 * Resolve the Vite base option from the configuration.
 */
function resolveBase(config: Required<PluginConfig>, assetUrl: string): string {
  return "/" + assetUrl + "/";
}

/**
 * Resolve the Vite input path from the configuration.
 */
function resolveInput(
  config: Required<PluginConfig>,
  ssr: boolean,
): Rollup.InputOption | undefined {
  if (ssr) {
    return config.ssr;
  }

  // Convert string arrays to proper rollup input format
  if (Array.isArray(config.input)) {
    return config.input.map((entry: string) =>
      path.resolve(process.cwd(), entry),
    );
  }

  if (typeof config.input === "string") {
    return path.resolve(process.cwd(), config.input);
  }

  return config.input;
}

/**
 * Resolve the Vite outDir path from the configuration.
 */
function resolveOutDir(
  config: Required<PluginConfig>,
  ssr: boolean,
): string | undefined {
  if (ssr) {
    return config.ssrOutputDirectory;
  }

  return path.join(config.publicDirectory, config.buildDirectory);
}

/**
 * Add the Inertia helpers to the list of SSR dependencies that aren't externalized.
 *
 * @see https://vitejs.dev/guide/ssr.html#ssr-externals
 */
function noExternalInertiaHelpers(
  config: UserConfig,
): true | Array<string | RegExp> {
  /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
  /* @ts-ignore */
  const userNoExternal = (config.ssr as SSROptions | undefined)?.noExternal;
  const pluginNoExternal = ["phoenix-vite-plugin"];

  if (userNoExternal === true) {
    return true;
  }

  if (typeof userNoExternal === "undefined") {
    return pluginNoExternal;
  }

  return [
    ...(Array.isArray(userNoExternal) ? userNoExternal : [userNoExternal]),
    ...pluginNoExternal,
  ];
}

/**
 * Resolve the server config for local development environments with TLS support.
 * This function attempts to detect and use certificates from local development tools.
 */
function resolveDevelopmentEnvironmentServerConfig(
  detectTls: string | boolean | null,
  env: Record<string, string>,
):
  | {
      hmr?: { host: string };
      host?: string;
      https?: { cert: string; key: string };
    }
  | undefined {
  if (detectTls === false) {
    return;
  }

  // Use PHX_HOST from environment if available
  const phxHost = env.PHX_HOST;
  if (!phxHost && detectTls === null) {
    return;
  }

  const resolvedHost =
    detectTls === true || detectTls === null
      ? phxHost || "localhost"
      : detectTls;

  // Check for common certificate locations
  const homeDir = os.homedir();
  const searchPaths: string[] = [];
  const possibleCertPaths = [
    // mkcert default location (cross-platform)
    {
      key: path.join(homeDir, ".local/share/mkcert", `${resolvedHost}-key.pem`),
      cert: path.join(homeDir, ".local/share/mkcert", `${resolvedHost}.pem`),
      name: "mkcert",
    },
    // mkcert on macOS
    {
      key: path.join(
        homeDir,
        "Library/Application Support/mkcert",
        `${resolvedHost}-key.pem`,
      ),
      cert: path.join(
        homeDir,
        "Library/Application Support/mkcert",
        `${resolvedHost}.pem`,
      ),
      name: "mkcert (macOS)",
    },
    // Caddy certificates location
    {
      key: path.join(
        homeDir,
        ".local/share/caddy/certificates/local",
        `${resolvedHost}`,
        `${resolvedHost}.key`,
      ),
      cert: path.join(
        homeDir,
        ".local/share/caddy/certificates/local",
        `${resolvedHost}`,
        `${resolvedHost}.crt`,
      ),
      name: "Caddy",
    },
    // Generic location in project
    {
      key: path.join(process.cwd(), "priv/cert", `${resolvedHost}-key.pem`),
      cert: path.join(process.cwd(), "priv/cert", `${resolvedHost}.pem`),
      name: "project (priv/cert)",
    },
    {
      key: path.join(process.cwd(), "priv/cert", `${resolvedHost}.key`),
      cert: path.join(process.cwd(), "priv/cert", `${resolvedHost}.crt`),
      name: "project (priv/cert)",
    },
    // Additional common project locations
    {
      key: path.join(process.cwd(), "certs", `${resolvedHost}-key.pem`),
      cert: path.join(process.cwd(), "certs", `${resolvedHost}.pem`),
      name: "project (certs/)",
    },
    {
      key: path.join(process.cwd(), "certs", `${resolvedHost}.key`),
      cert: path.join(process.cwd(), "certs", `${resolvedHost}.crt`),
      name: "project (certs/)",
    },
  ];

  for (const certPath of possibleCertPaths) {
    searchPaths.push(`${certPath.name}: ${path.dirname(certPath.cert)}`);
    if (fs.existsSync(certPath.key) && fs.existsSync(certPath.cert)) {
      if (process.env.DEBUG || process.env.VERBOSE) {
        console.log(
          colors.dim(`Found TLS certificates in ${certPath.name} location`),
        );
      }
      return {
        hmr: { host: resolvedHost },
        host: resolvedHost,
        https: {
          key: certPath.key,
          cert: certPath.cert,
        },
      };
    }
  }

  // If detectTls was explicitly requested but no certs found
  if (detectTls !== null) {
    const uniquePaths = [...new Set(searchPaths)];
    console.warn(
      `
[nb-vite] ${colors.yellow("Warning")}: Unable to find TLS certificate files for host "${resolvedHost}".\n\n` +
        `Searched in the following locations:\n` +
        uniquePaths.map((p) => `  - ${p}`).join("\n") +
        "\n\n" +
        `To generate local certificates, you can use mkcert:\n` +
        `  ${colors.dim("$")} brew install mkcert  ${colors.dim("# Install mkcert (macOS)")}\n` +
        `  ${colors.dim("$")} mkcert -install        ${colors.dim("# Install local CA")}\n` +
        `  ${colors.dim("$")} mkcert ${resolvedHost}  ${colors.dim("# Generate certificate")}\n` +
        `  ${colors.dim("$")} mkdir -p priv/cert     ${colors.dim("# Create cert directory")}\n` +
        `  ${colors.dim("$")} mv ${resolvedHost}*.pem priv/cert/  ${colors.dim("# Move certificates")}\n\n` +
        `Or set detectTls: false in your vite.config.js to disable TLS detection.\n`,
    );
  }

  return;
}

/**
 * Resolve aliases for Phoenix colocated hooks.
 *
 * In Phoenix 1.8, LiveView hooks can be colocated with their components.
 * These are placed in the build directory under lib/{app_name}/priv/phoenix-colocated.
 * This function detects the app name and creates the necessary alias.
 *
 * @returns Record of colocated aliases
 */
function resolvePhoenixColocatedAliases(): Record<string, string> {
  const aliases: Record<string, string> = {};

  // Try to determine the app name from mix.exs
  const appName = getPhoenixAppName();
  if (!appName) {
    return aliases;
  }

  // Check if Phoenix 1.8 is being used
  if (!isPhoenix18()) {
    return aliases;
  }

  // Build the colocated path
  const buildPath = process.env.PHX_BUILD_PATH || path.resolve(process.cwd(), '../../_build/dev');
  const colocatedPath = path.resolve(buildPath, `phoenix-colocated/${appName}`);

  // Add the alias
  aliases[`phoenix-colocated/${appName}`] = colocatedPath;

  if (process.env.DEBUG || process.env.VERBOSE) {
    console.log(
      colors.dim(
        `Phoenix colocated alias: phoenix-colocated/${appName} -> ${colocatedPath}`
      )
    );
  }

  return aliases;
}

/**
 * Get the Phoenix app name from environment variable
 */
function getPhoenixAppName(): string | undefined {
  return process.env.PHX_APP_NAME;
}

/**
 * Check if Phoenix 1.8 is being used
 */
function isPhoenix18(): boolean {
  return process.env.PHX_VERSION === "1.8";
}

/**
 * Resolve aliases for Phoenix JavaScript libraries.
 * 
 * This function automatically detects and creates Vite aliases for Phoenix JS dependencies
 * that are managed by Mix in the deps directory. This allows importing these libraries
 * naturally (e.g., `import { Socket } from "phoenix"`) without needing to know their
 * actual file system location.
 * 
 * For package managers that don't support workspaces with non-standard structures
 * (npm, pnpm, yarn), this provides a clean way to resolve Phoenix dependencies.
 * 
 * @returns Record of library names to their resolved file paths
 */
function resolvePhoenixJSAliases(): Record<string, string> {
  const aliases: Record<string, string> = {};
  const depsPath = path.resolve(process.cwd(), "../deps");

  // Phoenix library configurations
  const phoenixLibraries = [
    {
      name: "phoenix",
      paths: [
        "phoenix/priv/static/phoenix.mjs",  // Prefer ESM version
        "phoenix/priv/static/phoenix.js",    // Fallback to regular JS
      ],
    },
    {
      name: "phoenix_html",
      paths: [
        "phoenix_html/priv/static/phoenix_html.js",  // No ESM version available
      ],
    },
    {
      name: "phoenix_live_view",
      paths: [
        "phoenix_live_view/priv/static/phoenix_live_view.esm.js",  // Prefer ESM version
        "phoenix_live_view/priv/static/phoenix_live_view.js",      // Fallback to regular JS
      ],
    },
  ];

  // Check each library and use the first available version
  for (const library of phoenixLibraries) {
    for (const libPath of library.paths) {
      const fullPath = path.join(depsPath, libPath);
      if (fs.existsSync(fullPath)) {
        aliases[library.name] = fullPath;
        
        if (process.env.DEBUG || process.env.VERBOSE) {
          const isESM = libPath.includes('.mjs') || libPath.includes('.esm.');
          console.log(
            colors.dim(
              `Phoenix alias: ${library.name} -> ${libPath} ${isESM ? '(ESM)' : '(CommonJS)'}`
            )
          );
        }
        
        break;  // Use the first matching path
      }
    }
  }

  // Warn if expected Phoenix libraries are missing
  if (process.env.DEBUG || process.env.VERBOSE) {
    const missingLibraries = phoenixLibraries
      .filter(lib => !aliases[lib.name])
      .map(lib => lib.name);
    
    if (missingLibraries.length > 0) {
      console.log(
        colors.dim(
          `Missing Phoenix JS libraries: ${missingLibraries.join(', ')}. ` +
          `Make sure to run 'mix deps.get' in your Phoenix project.`
        )
      );
    }
  }

  return aliases;
}

// Re-export additional plugins
export { nbRoutes } from './vite-plugin-nb-routes';

export { phoenix };
