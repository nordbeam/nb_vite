# @nordbeam/nb-vite

Vite plugin for Phoenix Framework with SSR support and nb_routes auto-regeneration.

## Features

- **Phoenix Integration**: Seamless integration with Phoenix Framework
- **Hot Module Replacement (HMR)**: Full HMR support with automatic hot file management
- **SSR Support**: Server-side rendering using Vite 6+ Module Runner API
- **Auto-regeneration**: Automatic nb_routes regeneration when router files change
- **TLS Detection**: Automatic certificate detection for local HTTPS development
- **Docker Support**: Built-in support for Docker/container environments
- **TypeScript**: Full TypeScript support with type definitions

## Installation

```bash
# An optional global Vite+ CLI (macOS/Linux), then add the plugin from your Phoenix app.
curl -fsSL https://vite.plus | bash
vp -C assets add -D @nordbeam/nb-vite@git+https://github.com/nordbeam/nb_vite.git
# Without a global CLI, use the pinned bootstrap instead:
# npm exec --yes --package=vite-plus@0.3.0 -- vp -C assets add -D @nordbeam/nb-vite@git+https://github.com/nordbeam/nb_vite.git
```

The Phoenix installer pins `vite-plus@0.3.0`, aliases `vite` to
`npm:@voidzero-dev/vite-plus-core@0.3.0`, and pins the matching Vitest runtime.
Install dependencies with `mix nb_vite.deps`. NbVite prefers global `vp`, then
`assets/node_modules/.bin/vp`, and finally bootstraps the pinned CLI with
`npm exec --yes --package=vite-plus@0.3.0 -- vp ...`. npm 12.0.2 is required
for the npm bootstrap and generated assets projects; npm 11 is unsupported.
The installer sets `allow-git=root` and `allow-remote=all` in `assets/.npmrc` so
npm 12 can fetch the declared first-party package and registry packages such as
Tailwind that resolve platform artifacts through remote tarballs.
`@nordbeam/nb-vite` still comes directly from GitHub.

## Usage

### Basic Setup

Create or update your `vite.config.ts`:

```typescript
import { defineConfig, lazyPlugins } from 'vite-plus';
import phoenix from '@nordbeam/nb-vite';

export default defineConfig({
  plugins: lazyPlugins(() => [
    phoenix({
      input: ['js/app.ts']
    })
  ])
});
```

### With React

```typescript
import { defineConfig, lazyPlugins } from 'vite-plus';
import react from '@vitejs/plugin-react';
import phoenix from '@nordbeam/nb-vite';

export default defineConfig({
  plugins: lazyPlugins(() => [
    react(),
    phoenix({
      input: ['js/app.tsx'],
      reactRefresh: true
    })
  ])
});
```

### With SSR Support

```typescript
import { defineConfig, lazyPlugins } from 'vite-plus';
import phoenix from '@nordbeam/nb-vite';

export default defineConfig({
  plugins: lazyPlugins(() => [
    phoenix({
      input: ['js/app.tsx'],
      ssr: 'js/ssr.tsx',
      ssrDev: {
        enabled: true,
        entryPoint: './js/ssr_dev.tsx'
      }
    })
  ])
});
```

### With nb_routes Auto-regeneration

```typescript
import { defineConfig, lazyPlugins } from 'vite-plus';
import phoenix from '@nordbeam/nb-vite';
import { nbRoutes } from '@nordbeam/nb-vite/nb-routes';

export default defineConfig({
  plugins: lazyPlugins(() => [
    phoenix({
      input: ['js/app.ts']
    }),
    nbRoutes({
      enabled: true,
      verbose: true
    })
  ])
});
```

## Configuration Options

### Phoenix Plugin Options

```typescript
interface PluginConfig {
  // Required: Entry points for your application
  input: string | string[] | Rollup.InputOption;

  // Phoenix's public directory (default: 'priv/static')
  publicDirectory?: string;

  // Build output directory (default: 'assets')
  buildDirectory?: string;

  // Path to the hot file (default: 'priv/hot')
  hotFile?: string;

  // SSR entry point for production builds
  ssr?: string | string[] | Rollup.InputOption;

  // SSR output directory (default: 'priv/ssr')
  ssrOutputDirectory?: string;

  // SSR development server configuration
  ssrDev?: boolean | {
    enabled?: boolean;
    path?: string;           // Endpoint path (default: '/ssr')
    healthPath?: string;     // Health check path (default: '/ssr-health')
    entryPoint?: string;     // Dev entry point (default: './js/ssr_dev.tsx')
    hotFile?: string;        // SSR hot file (default: 'priv/ssr-hot')
  };

  // Enable React Refresh (default: false)
  reactRefresh?: boolean;

  // Full page refresh configuration
  refresh?: boolean | string | string[] | RefreshConfig | RefreshConfig[];

  // Auto-detect TLS certificates (default: null)
  detectTls?: string | boolean | null;

  // Transform code while serving
  transformOnServe?: (code: string, url: string) => string;
}
```

### nbRoutes Plugin Options

```typescript
interface NbRoutesPluginOptions {
  // Enable or disable the plugin (default: true)
  enabled?: boolean;

  // Router files to watch (default: ['lib/**/*_web/router.ex', 'lib/**/router.ex'])
  routerPath?: string | string[];

  // Debounce delay in ms (default: 300)
  debounce?: number;

  // Enable verbose logging (default: false)
  verbose?: boolean;

  // Path to generated routes file (default: 'assets/js/routes.js')
  routesFile?: string;

  // Command to run (default: 'mix nb_routes.gen')
  command?: string;
}
```

## Environment Variables

The plugin supports several environment variables for configuration:

- `PHX_HOST`: Phoenix host (e.g., `localhost:4000`)
- `VITE_PORT`: Vite dev server port (default: 5173)
- `ASSET_URL`: Asset URL prefix for production builds
- `VITE_DEV_SERVER_KEY`: Path to TLS key file
- `VITE_DEV_SERVER_CERT`: Path to TLS certificate file
- `PHOENIX_DOCKER`: Enable Docker mode
- `DEBUG` or `VERBOSE`: Enable debug logging

## SSR with Module Runner API

As of version 0.2.0, nb_vite uses Vite's built-in Module Runner API (Vite 6+) for SSR development:

**Benefits:**
- ~50% less code (no vite-node dependency)
- Better performance with direct Vite integration
- Automatic source map support
- Improved HMR
- Future-proof with official Vite API

**Requirements:**
- Vite 6.0.0 or higher

## Full Reload Patterns

By default, the plugin enables full page reload for common Phoenix file patterns:

```typescript
const refreshPaths = [
  'lib/**/*.ex',
  'lib/**/*.heex',
  'lib/**/*.eex',
  'lib/**/*.leex',
  'lib/**/*.sface',
  'priv/gettext/**/*.po'
];
```

You can customize this with the `refresh` option:

```typescript
phoenix({
  input: ['js/app.ts'],
  refresh: [
    'lib/my_app_web/**/*.ex',
    'lib/my_app_web/**/*.heex'
  ]
})
```

## TLS/HTTPS Support

The plugin can automatically detect and use local TLS certificates:

```typescript
phoenix({
  input: ['js/app.ts'],
  detectTls: true  // Auto-detect from PHX_HOST
})
```

Supported certificate locations:
- mkcert (macOS and Linux)
- Caddy
- Project `priv/cert/` directory

## Docker Support

For Docker/container environments, set the `PHOENIX_DOCKER` environment variable:

```bash
PHOENIX_DOCKER=1 vp dev
```

This configures the dev server to listen on `0.0.0.0` for container networking.

## TypeScript Support

The package includes full TypeScript declarations. No additional `@types` packages are needed.

## Compatibility

- **Vite+ workflow**: 0.3.0 (Vite 8.2.2 toolchain)
- **Vite peer API**: 5.0.0, 6.0.0, 7.0.0, 8.0.0+
- **Phoenix**: 1.7+
- **Node.js**: 20.19.0+
- **TypeScript**: 5.9 for the GitHub-distributed plugin build. Vite+'s bundled
  TypeScript 7 checker is not used for the generated app's authoritative type check.

## Vite+ commands

Run these from the Phoenix `assets/` directory (or prefix with `vp -C assets`)
when the direct CLI is available. The `mix nb_vite` tasks resolve the same
global/local/bootstrap order:

```bash
vp install       # Resolve the assets lockfile
vp dev           # Start Vite with Phoenix HMR
vp build         # Build production assets
vp preview       # Preview a production build
vp check         # Format and lint
vp run check     # Run vp check plus the TypeScript 5.9 compiler
```

Use `vp run <script>` when you need to invoke a script from `package.json`.
For this package's GitHub-distributed library, `vp pack` is the build command and
copies `src/dev-server-index.html` into `dist/` explicitly.

## Migration from File Reference

If you're currently using a file reference to nb_vite (e.g., from the Mix package), you can migrate to the GitHub package:

**Before:**
```typescript
import phoenix from '../../../deps/nb_vite/priv/static/nb_vite/index.js';
```

**After:**
```typescript
import phoenix from '@nordbeam/nb-vite';
```

## Examples

### Complete Phoenix + React + Inertia Setup

```typescript
import { defineConfig, lazyPlugins } from 'vite-plus';
import react from '@vitejs/plugin-react';
import phoenix from '@nordbeam/nb-vite';
import { nbRoutes } from '@nordbeam/nb-vite/nb-routes';

export default defineConfig({
  plugins: lazyPlugins(() => [
    react(),
    phoenix({
      input: ['js/app.tsx'],
      reactRefresh: true,
      refresh: true
    }),
    nbRoutes({
      enabled: true
    })
  ])
});
```

### With Custom Configuration

```typescript
import { defineConfig, lazyPlugins } from 'vite-plus';
import phoenix from '@nordbeam/nb-vite';

export default defineConfig({
  plugins: lazyPlugins(() => [
    phoenix({
      input: {
        app: 'js/app.ts',
        admin: 'js/admin.ts'
      },
      publicDirectory: 'priv/static',
      buildDirectory: 'assets',
      refresh: [
        'lib/my_app_web/**/*.{ex,heex}',
        'priv/gettext/**/*.po'
      ],
      detectTls: 'myapp.test'
    })
  ])
});
```

## License

MIT - see [LICENSE](LICENSE) file for details.

## Links

- [GitHub Repository](https://github.com/nordbeam/nb)
- [nb_vite Elixir Package](https://hex.pm/packages/nb_vite)
- [Issue Tracker](https://github.com/nordbeam/nb/issues)

## Related Packages

Part of the Nordbeam suite:

- [@nordbeam/nb-inertia](https://hex.pm/packages/nb_inertia) - Inertia.js integration for Phoenix
- [@nordbeam/nb-routes](https://hex.pm/packages/nb_routes) - Type-safe route helpers
- [@nordbeam/nb-ts](https://hex.pm/packages/nb_ts) - TypeScript type generation
- [@nordbeam/nb-serializer](https://hex.pm/packages/nb_serializer) - JSON serialization

## Contributing

Contributions are welcome! Please see the [main repository](https://github.com/nordbeam/nb) for contribution guidelines.
