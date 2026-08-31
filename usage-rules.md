# NbVite Usage Rules

Use `nb_vite` for the Phoenix integration with Vite+, including HMR, asset
helpers, production manifests, framework entrypoints, SSR, and the optional
`nb_routes` watcher. The Elixir package and the GitHub-installed
`@nordbeam/nb-vite` client package are complementary; inspect both before
changing an application's setup.

## Installation

Install the Phoenix integration with its Igniter task, then install the
standard dependency-backed skill manager:

```bash
mix igniter.install nb_vite --typescript
mix igniter.install usage_rules
```

Configure the application project's `mix.exs` so the package skill is synced
to the project-local agent directory:

```elixir
def project do
  [
    # ...
    usage_rules: usage_rules()
  ]
end

defp usage_rules do
  [
    skills: [
      location: ".agents/skills",
      package_skills: [:nb_vite]
    ]
  ]
end
```

Then sync the configured package skill:

```bash
mix usage_rules.sync
```

## Vite+ workflow

Use the generated `vite-plus` configuration and run frontend commands from
the `assets/` directory:

```bash
vp install
vp dev
vp check
vp build
```

Generated projects use the pinned Vite+ release and npm 12 bootstrap fallback
documented by the selected package release. Preserve existing scripts and
dependencies when migrating an application.

## Phoenix integration

Use `NbVite.vite_client/0`, `NbVite.react_refresh/0`, and
`NbVite.vite_assets/1` in the root layout. Development assets come from the
Vite+ server; production assets come from the generated manifest. If
`nb_routes` is installed, add its matching `nbRoutes` export to the Vite+
plugin list and verify the router glob and `mix nb_routes.gen` command.

For Phoenix 1.8 colocated hooks or SSR, confirm the selected installer detects
the feature before enabling it and test the generated aliases/entrypoints.

## Verification

Run `mix deps.get`, `mix compile`, `mix test`, `vp check`, and `vp build` (or
`vp pack` when refreshing the distributed plugin). Check `priv/hot`, the
manifest path, TLS settings, and watcher output when diagnosing asset or HMR
issues.
