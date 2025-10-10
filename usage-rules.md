# NbVite Usage Rules

## What is NbVite?

NbVite is a Phoenix integration library for Vite that enables modern frontend development with Hot Module Replacement (HMR), framework support (React, Vue, Svelte), and optimized production builds. It provides seamless integration between Elixir/Phoenix and Vite's build tooling.

**Note**: This is a PURE Vite integration. For Inertia.js support, use the separate `nb_inertia` package.

## Installation

### Add to mix.exs

```elixir
def deps do
  [
    {:nb_vite, "~> 0.1"}
  ]
end
```

### Run Igniter installer

```bash
mix deps.get
mix igniter.install nb_vite --react --typescript
```

The installer automatically configures your Phoenix project.

## Core Template Helpers

All helpers are in the `NbVite` module. Alias it in your Phoenix helpers:

```elixir
# lib/myapp_web.ex
def html do
  quote do
    # ... existing imports ...
    alias NbVite, as: Vite
  end
end
```

### Essential Helpers

```heex
<!-- Development HMR client (auto-included only in dev) -->
<%= NbVite.vite_client() %>

<!-- React Fast Refresh (if using React, only in dev) -->
<%= NbVite.react_refresh() %>

<!-- Load JavaScript/CSS assets (auto-switches dev/prod) -->
<%= NbVite.vite_assets("js/app.js") %>
<%= NbVite.vite_assets("css/app.css") %>

<!-- Multiple assets at once -->
<%= NbVite.vite_assets(["js/app.js", "css/app.css"]) %>

<!-- Get raw asset path -->
<link rel="stylesheet" href={NbVite.asset_path("css/custom.css")} />
```

### Typical Layout Pattern

```heex
<!-- lib/myapp_web/components/layouts/root.html.heex -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <%= NbVite.vite_client() %>
    <%= NbVite.react_refresh() %>
    <%= NbVite.vite_assets(["js/app.js", "css/app.css"]) %>
  </head>
  <body>
    <%= @inner_content %>
  </body>
</html>
```

## Environment Behavior

NbVite automatically detects the environment:

- **Development**: Assets loaded from Vite dev server (http://localhost:5173) with HMR
- **Production**: Assets loaded from manifest.json with hashed filenames

Detection uses `priv/hot` file (created by Vite dev server).

## Mix Tasks

```bash
# Run Vite dev server
mix nb_vite dev

# Install JavaScript dependencies
mix nb_vite.deps

# Build assets for production
mix nb_vite.build

# Any Vite command
mix nb_vite <command> <args>
```

## Configuration

### Application Config (Optional)

```elixir
# config/config.exs
config :nb_vite,
  hot_file: Path.join([File.cwd!(), "priv", "hot"]),
  manifest_path: Path.join([File.cwd!(), "priv", "static", "assets", "manifest.json"]),
  static_url_path: "/"  # Or function for CDN
```

### CDN Support

```elixir
# config/prod.exs
config :nb_vite, :static_url_path, fn path ->
  "https://cdn.example.com#{path}"
end
```

## Development Workflow

1. **Start Phoenix with Vite dev server**:
   ```bash
   mix phx.server
   ```
   The Vite dev server runs automatically via Phoenix watchers.

2. **Edit assets**: Changes auto-reload via HMR
3. **Add new assets**: Include them in `vite.config.js` input array

## Production Deployment

```bash
mix nb_vite.build    # Builds assets
mix phx.digest       # Digests static files
```

Or use the typical assets.deploy alias:

```elixir
# mix.exs
defp aliases do
  [
    "assets.deploy": ["nb_vite.build", "phx.digest"]
  ]
end
```

Then: `mix assets.deploy`

## Common Patterns

### Multiple Entry Points

```javascript
// assets/vite.config.js
import phoenix from 'nb_vite'

export default defineConfig({
  plugins: [
    phoenix({
      input: [
        'js/app.js',
        'js/admin.js',
        'css/app.css'
      ],
      // ... other phoenix config
    })
  ]
})
```

```heex
<!-- Different entries for different pages -->
<%= NbVite.vite_assets("js/admin.js") %>
```

### Static Assets

Place images/fonts in `assets/images/` or `assets/fonts/`, then reference:

```heex
<img src={NbVite.asset_path("images/logo.png")} />
```

## Important Notes

- **Never manually manage priv/hot**: Created/removed by Vite dev server automatically
- **Manifest required in production**: Run `mix nb_vite.build` before deployment
- **Asset paths must match Vite config**: Entry points in `vite.config.js` must match paths passed to `vite_assets/1`
- **For Inertia.js**: Use `nb_inertia` package separately

## Troubleshooting

**"Asset not found in Vite manifest"**: Run `mix nb_vite.build` or check that the asset path matches vite.config.js

**"Vite dev server is not running"**: Start Phoenix with `mix phx.server` or manually run `mix nb_vite dev`

**HMR not working**: Check that `priv/hot` file exists and contains correct dev server URL

**Assets not loading in production**: Ensure `mix nb_vite.build` was run and manifest.json exists
