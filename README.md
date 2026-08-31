# NbVite

Pure Phoenix + Vite integration for fast frontend builds.

**Note**: For Inertia.js support, see the separate [nb_inertia](https://github.com/nordbeam/nb_inertia) package.

## Features

- Lightning Fast HMR - See changes instantly
- Zero Configuration - Works out of the box
- Framework Agnostic - React, Vue, Svelte, vanilla JS
- Optimized Builds - Code splitting and tree shaking
- Modern Development - ES modules, TypeScript, JSX
- Modular - Core Vite integration only

## Installation

```bash
mix igniter.install nb_vite --typescript
```

## Usage

```heex
<%= NbVite.vite_client() %>
<%= NbVite.react_refresh() %>
<%= NbVite.vite_assets("js/app.js") %>
<%= NbVite.vite_assets("css/app.css") %>
```

## GitHub JavaScript Package

The Vite plugin is installed directly from GitHub. Nordbeam does not publish it
to the npm registry:

```bash
# An optional global Vite+ CLI (macOS/Linux)
curl -fsSL https://vite.plus | bash

# From the Phoenix project root, add the plugin to assets/
vp -C assets add -D @nordbeam/nb-vite@git+https://github.com/nordbeam/nb_vite.git
# Without a global CLI, use the pinned bootstrap instead:
# npm exec --yes --package=vite-plus@0.3.0 -- vp -C assets add -D @nordbeam/nb-vite@git+https://github.com/nordbeam/nb_vite.git
```

Vite+ is the supported project workflow. The installer adds
`vite-plus@0.3.0`, aliases `vite` to
`npm:@voidzero-dev/vite-plus-core@0.3.0`, and pins Vite+'s Vitest runtime.
The installer and `mix nb_vite` tasks do not require a global CLI: they prefer
global `vp`, then `assets/node_modules/.bin/vp`, and finally bootstrap the
pinned CLI with `npm exec --yes --package=vite-plus@0.3.0 -- vp ...`.
For an existing app, run `mix nb_vite.deps` after migrating its manifest.
The generated manifest requires npm 12.0.2, and `mix nb_vite.deps` runs the
Vite+ installer. The installer writes `assets/.npmrc` with `allow-git=root` for
the application-declared GitHub packages and `allow-remote=all` for registry
packages such as Tailwind that resolve platform artifacts through remote
tarballs. The Nordbeam package source remains GitHub.

When migrating an existing `assets/package.json`, the installer removes the
legacy Phoenix workspaces `../deps/phoenix`, `../deps/phoenix_html`, and
`../deps/phoenix_live_view`. Any custom workspace entries and workspace
configuration are preserved.

**Benefits of using the package:**
- Standard package dependency management through Vite+
- Git commit pinning through the generated lockfile
- Better IDE integration and type checking
- Smaller Phoenix application footprint

**Usage:**

```typescript
// assets/vite.config.ts
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

Use `vp dev`, `vp build`, `vp preview`, and `vp check` from `assets/` (or
prefix them with `vp -C assets`) when the global or local CLI is available.
The equivalent Mix tasks resolve the CLI automatically. Use `vp run <script>`
when you explicitly want to invoke a `package.json` script.

**Legacy file reference:** The plugin is also bundled in `priv/static/nb_vite/`
for projects that prefer file references, but the Vite+ + GitHub dependency
workflow is recommended for new projects.

## Vite Plugins

NbVite includes specialized Vite plugins for enhanced Phoenix integration.

### nb_routes Auto-Regeneration Plugin

Automatically regenerate route helpers when your Phoenix router changes, with instant Hot Module Replacement (HMR).

**Features:**
- Watches Phoenix router files for changes
- Auto-runs `mix nb_routes.gen` when router.ex changes
- Triggers HMR to reload routes in browser instantly
- Debounces rapid changes to avoid excessive regeneration
- Configurable file patterns and commands

**Setup:**

```typescript
// assets/vite.config.ts
import { defineConfig, lazyPlugins } from 'vite-plus';
import phoenix from '@nordbeam/nb-vite';
import { nbRoutes } from '@nordbeam/nb-vite/nb-routes';

export default defineConfig({
  plugins: lazyPlugins(() => [
    phoenix({
      input: ['js/app.ts'],
    }),
    nbRoutes({
      enabled: true,       // Enable the plugin (default: true in dev)
      verbose: false,      // Enable detailed logging (default: false)
      debounce: 300        // Debounce delay in ms (default: 300)
    })
  ]),
});
```

**Configuration Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` (dev only) | Enable/disable the plugin |
| `routerPath` | `string \| string[]` | `['lib/**/*_web/router.ex']` | Router file patterns to watch |
| `routesFile` | `string` | `'assets/js/routes.js'` | Path to generated routes file |
| `command` | `string` | `'mix nb_routes.gen'` | Command to run for generation |
| `debounce` | `number` | `300` | Debounce delay in milliseconds |
| `verbose` | `boolean` | `false` | Enable verbose logging |

**How It Works:**

1. Plugin integrates with Vite's file watcher
2. Watches router files (e.g., `lib/my_app_web/router.ex`)
3. On change, spawns `mix nb_routes.gen` to regenerate helpers
4. Invalidates routes module in Vite's module graph
5. Triggers HMR update to refresh routes in browser

**Example Output:**

```
[nb-routes] Router file changed: lib/my_app_web/router.ex
[nb-routes] Regenerating routes...
[nb-routes] ✓ Routes regenerated successfully
[nb-routes] HMR update sent to browser
```

**Advanced Configuration:**

```typescript
nbRoutes({
  enabled: process.env.NODE_ENV === 'development',
  routerPath: [
    'lib/my_app_web/router.ex',
    'lib/my_app_web/api_router.ex'
  ],
  routesFile: 'assets/js/routes.js',
  command: 'mix nb_routes.gen --variant rich --with-forms',
  debounce: 500,  // Longer debounce for slower machines
  verbose: true   // Debug mode
})
```

**Multiple Routers:**

Watch and regenerate from multiple router files:

```typescript
nbRoutes({
  routerPath: [
    'lib/my_app_web/router.ex',
    'lib/my_app_web/admin_router.ex',
    'lib/my_app_web/api/v1/router.ex'
  ]
})
```

**Custom Commands:**

Use custom generation commands with specific options:

```typescript
nbRoutes({
  // Rich mode with form helpers
  command: 'mix nb_routes.gen --variant rich --with-methods --with-forms'
})
```

**Disabling in CI/Production:**

```typescript
nbRoutes({
  enabled: process.env.NODE_ENV === 'development' && !process.env.CI
})
```

**Requirements:**

- `nb_routes` package installed and configured
- Phoenix router with routes defined
- Vite development server running

**See also:** [nb_routes documentation](https://github.com/nordbeam/nb/tree/main/nb_routes) for route helper configuration.

## Inertia.js Support

For SPAs with Inertia.js, use **[nb_inertia](https://github.com/nordbeam/nb_inertia)**:

```elixir
{:nb_vite, github: "nordbeam/nb_vite"},
{:nb_inertia, github: "nordbeam/nb_inertia"}
```

See [REFACTORING_NOTES.md](REFACTORING_NOTES.md) for details on the split from Vitex.

## Vite+ compatibility

Generated projects target Vite+ `0.3.0`, Node.js `>=20.19.0`, and the Vite+
Vite 8 toolchain. The GitHub-distributed plugin keeps its peer range for Vite 5–8 to
preserve the `@nordbeam/nb-vite` API. The library build stays on TypeScript
5.9 because the current declaration/plugin stack is not compatible with
TypeScript 7. Generated TypeScript apps therefore use `vp check` for formatting
and linting, then TypeScript 5.9 via `vp run check` for the authoritative type
check.

## Documentation

Full documentation available at [hexdocs.pm/nb_vite](https://hexdocs.pm/nb_vite/).

### Deployment

- **[Docker & Release Guide](DOCKER.md)** - Complete guide for deploying with Docker and Elixir releases

## License

MIT License - see [LICENSE](LICENSE)
