---
name: nb-vite
description: "Install, configure, upgrade, diagnose, and verify nb_vite Phoenix/Vite+ builds, HMR, TypeScript, SSR, legacy Bun, and route regeneration."
---

# NbVite

Use this skill for the `nb_vite` Phoenix integration, its GitHub-installed
Vite plugin, Vite+ HMR/build configuration, TLS, package-manager integration,
Phoenix 1.8 colocated hooks, SSR, or the optional `nb_routes` watcher.

## Discover the target release

- Inspect the target app's `mix.exs`, `mix.lock`, `assets/package.json`,
  package-manager lockfile, Vite config, entrypoints, endpoint/root layout,
  development config, and static manifest.
- Read the selected README, installer source, and bundled JavaScript
  `package.json` before changing versions or imports.
- Treat the Elixir package and `@nordbeam/nb-vite` JavaScript package as
  complementary entry points. Keep `nb_routes` integration optional.

## Install and configure

- Prefer `mix igniter.install nb_vite`; pass only task-supported flags such as
  `--typescript`, `--tls`, and `--yes`.
- Let the installer update config, helpers, watchers, Vite config, scripts,
  dependencies, layout, and assets. Preserve application-owned changes.
- Import `defineConfig` (and `lazyPlugins` when needed) from `vite-plus`, and
  use the detected framework's actual entrypoints.
- Add `nbRoutes` only when `nb_routes` is installed and the client export and
  route-generation command match the target release.

## Upgrade and verify

- Compare the locked Elixir/client versions, Vite+ toolchain, generated config,
  and changelog before migrating an existing app.
- For missing assets or HMR, check the Vite root/input, watcher, `priv/hot`,
  manifest path, host/port/TLS, and browser console.
- Run `mix deps.get`, `mix compile`, `mix test`, `vp check`, `vp test`, and
  `vp build` (or `vp pack` for the library). Exercise SSR only when enabled.
