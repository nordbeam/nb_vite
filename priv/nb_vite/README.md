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
npm install @nordbeam/nb-vite --save-dev
```

Or with other package managers:

```bash
# Yarn
yarn add @nordbeam/nb-vite --dev

# pnpm
pnpm add @nordbeam/nb-vite --save-dev

# Bun
bun add @nordbeam/nb-vite --dev
```

## Usage

### Basic Setup

Create or update your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import phoenix from '@nordbeam/nb-vite';

export default defineConfig({
  plugins: [
    phoenix({
      input: ['js/app.ts']
    })
  ]
});
```

### With React

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import phoenix from '@nordbeam/nb-vite';

export default defineConfig({
  plugins: [
    react(),
    phoenix({
      input: ['js/app.tsx'],
      reactRefresh: true
    })
  ]
});
```

### With SSR Support

```typescript
import { defineConfig } from 'vite';
import phoenix from '@nordbeam/nb-vite';

export default defineConfig({
  plugins: [
    phoenix({
      input: ['js/app.tsx'],
      ssr: 'js/ssr.tsx',
      ssrDev: {
        enabled: true,
        entryPoint: './js/ssr_dev.tsx'
      }
    })
  ]
});
```

### With nb_routes Auto-regeneration

```typescript
import { defineConfig } from 'vite';
import phoenix from '@nordbeam/nb-vite';
import { nbRoutes } from '@nordbeam/nb-vite/nb-routes';

export default defineConfig({
  plugins: [
    phoenix({
      input: ['js/app.ts']
    }),
    nbRoutes({
      enabled: true,
      verbose: true
    })
  ]
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
PHOENIX_DOCKER=1 npm run dev
```

This configures the dev server to listen on `0.0.0.0` for container networking.

## TypeScript Support

The package includes full TypeScript declarations. No additional `@types` packages are needed.

## Compatibility

- **Vite**: 5.0.0, 6.0.0, 7.0.0+
- **Phoenix**: 1.7+
- **Node.js**: 18.0.0+

## Migration from File Reference

If you're currently using a file reference to nb_vite (e.g., from the Mix package), you can migrate to the npm package:

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
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import phoenix from '@nordbeam/nb-vite';
import { nbRoutes } from '@nordbeam/nb-vite/nb-routes';

export default defineConfig({
  plugins: [
    react(),
    phoenix({
      input: ['js/app.tsx'],
      reactRefresh: true,
      refresh: true
    }),
    nbRoutes({
      enabled: true
    })
  ]
});
```

### With Custom Configuration

```typescript
import { defineConfig } from 'vite';
import phoenix from '@nordbeam/nb-vite';

export default defineConfig({
  plugins: [
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
  ]
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

## Component Path Plugin

Automatically add `data-nb-component` attributes to all React and Vue components for easier debugging.

### Usage

```typescript
import phoenix, { componentPath } from '@nordbeam/nb-vite';

export default defineConfig({
  plugins: [
    phoenix(),
    componentPath()  // Development only by default
  ]
});
```

### Result

```html
<!-- Development -->
<div data-nb-component="assets/js/pages/Users/Show.tsx" class="user-profile">
  <h1>John Doe</h1>
</div>

<!-- Production (no attribute) -->
<div class="user-profile">
  <h1>John Doe</h1>
</div>
```

### Features

- 🔍 **Automatic Attribution**: Adds path to all component root elements
- ⚛️ **React Support**: TSX/JSX with Babel AST transformation
- 🖖 **Vue Support**: Vue 3 SFC components
- 🚀 **HMR Compatible**: Updates on every change
- 🎯 **Dev-Only**: Automatically disabled in production
- 📝 **Full Path**: Shows complete file path from project root

### Configuration

```typescript
componentPath({
  enabled: true,           // Force enable (even in production)
  includeExtension: true,  // Include .tsx/.jsx/.vue in path
  verbose: false           // Enable debug logging
})
```

See [COMPONENT_PATH_PLUGIN.md](../../COMPONENT_PATH_PLUGIN.md) for full documentation.

