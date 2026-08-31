---
name: nb-vite
description: "Install, configure, upgrade, diagnose, and verify nb_vite Phoenix/Vite+ builds, HMR, TypeScript, SSR, legacy Bun, and route regeneration."
---

# NbVite

Use this skill for the `nb_vite` Phoenix integration, its GitHub-installed Vite plugin, Vite+ (`vp`) HMR/build configuration, TLS, package-manager integration, Phoenix 1.8 colocated hooks, SSR build, or the optional `nb_routes` watcher.

## Discover the target release

- Inspect the target app's `mix.exs`, `mix.lock`, `assets/package.json`, `packageManager`/lockfile, `assets/vite.config.*`, `assets/js` entrypoints, endpoint/root layout, `config/dev.exs`, `config/test.exs`, and any existing `priv/static` manifest. Read the selected README, installer source, and bundled JavaScript `package.json` before changing versions or imports.
- Treat the Elixir package and the GitHub-installed `@nordbeam/nb-vite` JavaScript package as two entry points from the same repository; do not assume their runtime roles, subpath exports, or package manager are interchangeable. Keep `nb_routes` integration optional.

## Install

- Prefer `mix igniter.install nb_vite` and pass only task-supported flags such as `--typescript`, `--tls`, and `--yes`. The installer configures Vite+ and the `vp` watcher. Bun remains a legacy opt-in integration; do not assume a `--bun` flag unless the selected task exposes one.
- Let the installer update OTP app/config, web helpers, watcher setup, Vite config, package scripts/dependencies, root layout, and assets. Review each generated change and retain existing frontend framework choices.
- Install the global CLI when needed with `curl -fsSL https://vite.plus | bash`, then install project dependencies with `vp -C assets install`. Generated apps use `vite-plus@0.3.0`, the `vite` alias `npm:@voidzero-dev/vite-plus-core@0.3.0`, and a matching `vitest` override.
- For existing apps, merge the Vite+ fields into `assets/package.json` while preserving custom dependencies and scripts. The current installer upgrades `dev`, `build`, `preview`, and `check` to `vp` commands and sets Node `>=20.19.0`.

## Implement and configure

- Use the documented `NbVite.vite_client/0`, `react_refresh/0`, and `vite_assets/1` helpers when exposed, and keep asset URLs/layout integration consistent with the generated config.
- Import `defineConfig` (and, when plugin factories have side effects, `lazyPlugins`) from `vite-plus`, not `vite`, in generated Vite+ configs. Configure Vite input files, Phoenix plugin options, TLS, aliases, and dev server ports from the target app's structure. For React/Vue/Svelte/vanilla projects, follow the detected frontend entry and package versions rather than assuming React.
- Add `nbRoutes` from the matching GitHub-installed package only when `nb_routes` is installed and the target plugin export supports it. Watch the actual router patterns and use the current route generation command/config.
- For Phoenix 1.8 colocated hooks or SSR, confirm source/task detection and generated entry/config before enabling; these are version-sensitive integrations.

## Upgrade or migrate

- Compare `mix.lock`, `assets/package.json` and its lockfile, Vite+ toolchain (`vp toolchain`), generated config, and `nb_vite` changelog/source. Upgrade the Elixir and GitHub client pieces in a controlled change and preserve the app's package manager where Vite+ supports it.
- When migrating from vendored files, remove old copies only after imports/builds use the GitHub package. When changing entry extensions or SSR, update layout helpers, TypeScript config, and scripts together.
- Use `vp dev`, `vp build`, `vp preview`, `vp check`, and `vp test`; use `vp run <script>` only when invoking a package script. Use `vp pack` to refresh the GitHub-distributed `@nordbeam/nb-vite` build artifacts.
- Vite+ 0.3.0's type-aware lint path is powered by its bundled TypeScript 7 toolchain. The package build deliberately stays on TypeScript 5.9 because the current declaration/plugin stack is not TS7-compatible; disable `lint.options.typeAware`/`typeCheck` for an app whose custom TS setup cannot be analyzed by the bundled checker.
- Recheck test-environment manifest behavior, TLS certificates, watcher startup, and route-plugin command paths after any migration.

## Diagnose and verify

- For missing assets, inspect Vite's root/input, Phoenix endpoint/static paths, manifest generation, layout helper calls, and dev/test `allow_missing_manifest` behavior. For HMR, check watcher process, host/port/TLS, browser console, and package-manager install output.
- For route regeneration, verify the plugin is loaded from the installed package, router glob matches files, command succeeds in the app directory, and generated output matches the configured mode.
- Verify with `mix deps.get`, `mix compile`, `mix test`, `vp install`, `vp check`, `vp test`, `vp build` (or `vp pack` for the library), a dev HMR smoke test, and `mix nb_vite.ssr.build` or equivalent only when SSR is present in the target release.
- If “latest” is requested, consult current HexDocs/GitHub for `nb_vite`, the repository manifest and lockfile for `@nordbeam/nb-vite`, and official Vite/Phoenix docs; state the date checked and compare with both lockfiles.
