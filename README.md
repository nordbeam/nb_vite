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

## Inertia.js Support

For SPAs with Inertia.js, use **[nb_inertia](https://github.com/nordbeam/nb_inertia)**:

```elixir
{:nb_vite, "~> 0.1"},
{:nb_inertia, "~> 0.1"}
```

See [REFACTORING_NOTES.md](REFACTORING_NOTES.md) for details on the split from Vitex.

## Documentation

Full documentation available at [hexdocs.pm/nb_vite](https://hexdocs.pm/nb_vite/).

## License

MIT License - see [LICENSE](LICENSE)
