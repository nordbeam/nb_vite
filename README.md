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

```elixir
def deps do
  [
    {:nb_vite, "~> 0.1"}
  ]
end
```

```bash
mix igniter.install nb_vite --react --typescript
```

## Usage

```heex
<%= NbVite.vite_client() %>
<%= NbVite.react_refresh() %>
<%= NbVite.vite_assets("js/app.js") %>
<%= NbVite.vite_assets("css/app.css") %>
```

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
import { defineConfig } from 'vite';
import phoenix from '@nordbeam/nb-vite';
import { nbRoutes } from '@nordbeam/nb-vite/nb-routes';

export default defineConfig({
  plugins: [
    phoenix({
      input: ['js/app.ts'],
    }),
    nbRoutes({
      enabled: true,       // Enable the plugin (default: true in dev)
      verbose: false,      // Enable detailed logging (default: false)
      debounce: 300        // Debounce delay in ms (default: 300)
    })
  ],
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
{:nb_vite, "~> 0.1"},
{:nb_inertia, "~> 0.1"}
```

See [REFACTORING_NOTES.md](REFACTORING_NOTES.md) for details on the split from Vitex.

## Documentation

Full documentation available at [hexdocs.pm/nb_vite](https://hexdocs.pm/nb_vite/).

### Deployment

- **[Docker & Release Guide](DOCKER.md)** - Complete guide for deploying with Docker and Elixir releases

## License

MIT License - see [LICENSE](LICENSE)
