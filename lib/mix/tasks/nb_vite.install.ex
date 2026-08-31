if Code.ensure_loaded?(Igniter) do
  defmodule Mix.Tasks.NbVite.Install do
    @moduledoc """
    Installs and configures Phoenix Vite in a Phoenix application using Igniter.

    This installer:
    1. Creates a Vite+ config with appropriate Phoenix integration
    2. Updates package.json with Vite+ dependencies and scripts
    3. Adds the Vite+ watcher to the development configuration
    4. Updates the root layout template to use Vite helpers
    5. Creates or updates asset files for Vite

    ## Usage

        $ mix nb_vite.install

    ## Options

        --tls                Enable automatic TLS certificate detection
        --typescript         Enable TypeScript support
        --yes                Don't prompt for confirmations

    ## Inertia.js Support

    For Inertia.js integration with React and SSR, install nb_inertia separately after nb_vite:

        $ mix nb_vite.install --typescript
        $ mix nb_inertia.install

    See https://github.com/nordbeam/nb_inertia for more information.
    """

    use Igniter.Mix.Task

    alias Mix.Tasks.NbVite.Install.VitePlusIntegration

    @impl Igniter.Mix.Task
    def info(_argv, _parent) do
      %Igniter.Mix.Task.Info{
        group: :nb,
        example: "mix nb_vite.install --typescript --tls",
        schema: [
          typescript: :boolean,
          tls: :boolean,
          yes: :boolean
        ],
        defaults: [],
        positional: [],
        composes: []
      }
    end

    @impl Igniter.Mix.Task
    def igniter(igniter) do
      # Check if Phoenix 1.8 is being used (for colocated hooks support)
      igniter = detect_phoenix_1_8(igniter)

      igniter
      |> Igniter.Project.Formatter.import_dep(:nb_vite)
      |> VitePlusIntegration.integrate()
      |> configure_otp_app()
      |> configure_test_env()
      |> setup_html_helpers()
      |> create_vite_config()
      |> update_package_json()
      |> update_npmrc()
      |> remove_old_watchers()
      |> update_root_layout()
      |> setup_assets()
      |> print_next_steps()
    end

    # Compatibility helpers retained for callers of older installer APIs. The
    # old names are intentionally narrow so invoking one does not queue a
    # dependency install or rewrite unrelated project configuration.
    def update_mix_aliases(igniter) do
      VitePlusIntegration.update_mix_aliases(igniter)
    end

    def setup_watcher(igniter) do
      VitePlusIntegration.setup_watcher(igniter)
    end

    @deprecated "Bun support is legacy; Vite+ setup is performed by integrate/1."
    def maybe_add_bun_dep(igniter) do
      igniter
    end

    @deprecated "Bun support is legacy; Vite+ setup is performed by integrate/1."
    def maybe_setup_bun_config(igniter) do
      igniter
    end

    def configure_otp_app(igniter) do
      app_name = Igniter.Project.Application.app_name(igniter)

      Igniter.Project.Config.configure(
        igniter,
        "config.exs",
        :nb_vite,
        [:otp_app],
        app_name
      )
    end

    defp configure_test_env(igniter) do
      Igniter.Project.Config.configure(
        igniter,
        "test.exs",
        :nb_vite,
        [:allow_missing_manifest],
        true
      )
    end

    def setup_html_helpers(igniter) do
      update_web_ex_helper(igniter, :html, fn zipper ->
        import_code = """
            alias NbVite, as: Vite
        """

        with {:ok, zipper} <- move_to_last_import_or_alias(zipper) do
          {:ok, Igniter.Code.Common.add_code(zipper, import_code)}
        end
      end)
    end

    # Run an update function within the quote do ... end block inside a *web.ex helper function
    defp update_web_ex_helper(igniter, helper_name, update_fun) do
      web_module = Igniter.Libs.Phoenix.web_module(igniter)

      case Igniter.Project.Module.find_module(igniter, web_module) do
        {:ok, {igniter, _source, _zipper}} ->
          Igniter.Project.Module.find_and_update_module!(igniter, web_module, fn zipper ->
            with {:ok, zipper} <- Igniter.Code.Function.move_to_def(zipper, helper_name, 0),
                 {:ok, zipper} <- Igniter.Code.Common.move_to_do_block(zipper) do
              Igniter.Code.Common.within(zipper, update_fun)
            else
              :error ->
                {:warning, "Could not find #{helper_name}/0 function in #{inspect(web_module)}"}
            end
          end)

        {:error, igniter} ->
          Igniter.add_warning(
            igniter,
            "Could not find web module #{inspect(web_module)}. You may need to manually add NbVite helpers."
          )
      end
    end

    defp move_to_last_import_or_alias(zipper) do
      # Try to find the last import first
      case Igniter.Code.Common.move_to_last(
             zipper,
             &Igniter.Code.Function.function_call?(&1, :import)
           ) do
        {:ok, zipper} ->
          {:ok, zipper}

        _ ->
          # If no imports, try to find the last alias
          Igniter.Code.Common.move_to_last(
            zipper,
            &Igniter.Code.Function.function_call?(&1, :alias)
          )
      end
    end

    # Common detection helpers
    defp detect_tailwind(igniter) do
      css_path = "assets/css/app.css"

      if Igniter.exists?(igniter, css_path) do
        updated_igniter = Igniter.include_existing_file(igniter, css_path)

        source = Rewrite.source!(updated_igniter.rewrite, css_path)
        content = Rewrite.Source.get(source, :content)
        has_tailwind = String.contains?(content, "@import \"tailwindcss\"")
        {updated_igniter, has_tailwind}
      else
        {igniter, false}
      end
    end

    def create_vite_config(igniter) do
      {igniter, has_tailwind} = detect_tailwind(igniter)
      is_phoenix_1_8 = igniter.assigns[:is_phoenix_1_8] || false
      app_name = Igniter.Project.Application.app_name(igniter) |> to_string()

      # The plugin is installed from npm; no vendored JavaScript is needed.

      # Only pass typescript option for standard vite config - react and ssr are handled by nb_inertia
      simplified_options = %{typescript: igniter.args.options[:typescript]}
      config = build_vite_config(simplified_options, has_tailwind, is_phoenix_1_8, app_name)
      config_path = existing_vite_config_path(igniter)

      case config_path do
        nil ->
          Igniter.create_new_file(igniter, "assets/vite.config.js", config, on_exists: :skip)

        path ->
          migrate_existing_vite_config(igniter, path, simplified_options)
      end
    end

    defp existing_vite_config_path(igniter) do
      Enum.find(["assets/vite.config.ts", "assets/vite.config.js"], &Igniter.exists?(igniter, &1))
    end

    defp migrate_existing_vite_config(igniter, path, options) do
      Igniter.update_file(igniter, path, fn source ->
        content = Rewrite.Source.get(source, :content)
        migrated = migrate_vite_config_content(content, options)

        cond do
          migrated != content ->
            Rewrite.Source.update(source, :content, migrated)

          vite_plus_config?(content) ->
            source

          true ->
            {:notice,
             "#{path} was left unchanged because its structure was not recognized. Run `vp migrate --no-interactive` or apply the Vite+ import and metadata changes manually."}
        end
      end)
    end

    @doc false
    def vite_plus_config?(content) when is_binary(content) do
      Regex.match?(
        ~r/import\s*\{[^}]*\bdefineConfig\b[^}]*\}\s*from\s*['"]vite-plus['"]/,
        content
      )
    end

    @doc "Conservatively migrates a JavaScript/TypeScript Vite config to Vite+."
    def migrate_vite_config_content(content, options \\ %{}) when is_binary(content) do
      migrated = replace_vite_plus_define_config_import(content)
      migrated = maybe_wrap_plugins_with_lazy(migrated)

      migrated =
        if Regex.match?(~r/plugins:\s*lazyPlugins\s*\(/, migrated) do
          maybe_add_lazy_plugins_import(migrated)
        else
          migrated
        end

      maybe_add_vite_plus_quality_config(migrated, options)
    end

    defp replace_vite_plus_define_config_import(content) do
      regex = ~r/(import\s*\{[^}]*\bdefineConfig\b[^}]*\}\s*from\s*)['"]vite['"]/

      Regex.replace(
        regex,
        content,
        fn _full, prefix ->
          prefix <> "'vite-plus'"
        end,
        global: false
      )
    end

    defp maybe_wrap_plugins_with_lazy(content) do
      regex = ~r/plugins:(\s*)\[(?<body>[^\[\]]*)\]/s
      matches = Regex.scan(regex, content)

      if length(matches) == 1 and not String.contains?(content, "lazyPlugins") do
        Regex.replace(
          regex,
          content,
          fn _full, whitespace, body ->
            "plugins:" <> whitespace <> "lazyPlugins(() => [" <> body <> "])"
          end,
          global: false
        )
      else
        content
      end
    end

    defp maybe_add_lazy_plugins_import(content) do
      has_lazy_plugins_import =
        Regex.match?(
          ~r/import\s*\{[^}]*\blazyPlugins\b[^}]*\}\s*from\s*['"]vite-plus['"]/,
          content
        )

      if has_lazy_plugins_import do
        content
      else
        regex =
          ~r/(import\s*\{)([^}]*\bdefineConfig\b[^}]*)(\}\s*from\s*['"]vite-plus['"])/

        Regex.replace(
          regex,
          content,
          fn _full, opening, imports, closing ->
            opening <> String.trim_trailing(imports) <> ", lazyPlugins " <> closing
          end,
          global: false
        )
      end
    end

    defp maybe_add_vite_plus_quality_config(content, _options) do
      has_fmt = Regex.match?(~r/^\s*fmt\s*:/m, content)

      quality_config =
        [
          if(not has_fmt,
            do:
              "fmt: {\n    ignorePatterns: ['dist/**'],\n    singleQuote: true,\n    semi: true,\n    sortPackageJson: true,\n  },\n",
            else: ""
          )
        ]
        |> Enum.reject(&(&1 == ""))
        |> Enum.join()

      if quality_config == "" do
        content
      else
        case Regex.run(~r/defineConfig\(\s*\{/, content, return: :index) do
          [{index, match_length}] ->
            insert_at = index + match_length

            binary_part(content, 0, insert_at) <>
              "\n  " <>
              quality_config <> binary_part(content, insert_at, byte_size(content) - insert_at)

          _ ->
            content
        end
      end
    end

    defp build_vite_config(options, has_tailwind, is_phoenix_1_8, app_name) do
      if options[:ssr] do
        build_ssr_vite_config(options, has_tailwind, is_phoenix_1_8, app_name)
      else
        build_standard_vite_config(options, has_tailwind, is_phoenix_1_8, app_name)
      end
    end

    defp build_standard_vite_config(options, has_tailwind, is_phoenix_1_8, app_name) do
      imports = build_vite_imports(options, has_tailwind)
      plugins = build_vite_plugins(options, has_tailwind)
      input_files = build_input_files(options)
      additional_opts = build_additional_options(options)
      quality_config = build_quality_config(options)

      path_import = "\nimport path from 'path'"

      """
      import { defineConfig, lazyPlugins } from 'vite-plus'
      import phoenix from '@nordbeam/nb-vite'#{path_import}#{imports}

      export default defineConfig({
        #{quality_config}
        plugins: lazyPlugins(() => [#{plugins}
          phoenix({
            input: #{input_files},
            publicDirectory: '../priv/static',
            buildDirectory: 'assets',
            hotFile: '../priv/hot',
            manifestPath: '../priv/static/assets/manifest.json',#{additional_opts}
          })
        ]),
        server: {
          host: process.env.VITE_HOST || "127.0.0.1", // Force IPv4 for Elixir compatibility
          port: parseInt(process.env.VITE_PORT || "5173"),
        },#{build_resolve_config(options, is_phoenix_1_8, app_name)}
      })
      """
    end

    defp build_ssr_vite_config(options, has_tailwind, is_phoenix_1_8, app_name) do
      imports = build_vite_imports(options, has_tailwind)
      plugins = build_vite_plugins(options, has_tailwind)
      input_files = build_input_files(options)
      additional_opts = build_additional_options(options)
      extension = if options[:typescript], do: "tsx", else: "jsx"
      quality_config = build_quality_config(options)

      path_import = "\nimport path from 'path'"

      """
      import { defineConfig, lazyPlugins } from 'vite-plus'
      import phoenix from '@nordbeam/nb-vite'#{path_import}#{imports}
      import nodePrefixPlugin from './vite-plugins/node-prefix-plugin.js'

      export default defineConfig(({ isSsrBuild }) => {
        const isSSR = isSsrBuild || process.env.BUILD_SSR === "true";

        if (isSSR) {
          // SSR build configuration for Deno compatibility
          return {
            #{quality_config}
            plugins: lazyPlugins(() => [#{build_ssr_plugins(options)}nodePrefixPlugin()]),
            build: {
              ssr: true,
              outDir: "../priv/static",
              rollupOptions: {
                input: "js/ssr_prod.#{extension}",
                output: {
                  format: "esm",
                  entryFileNames: "ssr.js",
                  footer: "globalThis.render = render;",
                },
                external: (id) => id.startsWith('node:'),
              },
            },
            resolve: {
              alias: {
                "@": path.resolve(__dirname, "./js"),
              },
            },
            ssr: {
              noExternal: true,
              target: "neutral",
            },
          };
        }

        // Client build configuration
        return {
          #{quality_config}
          plugins: lazyPlugins(() => [#{plugins}
            phoenix({
              input: #{input_files},
              publicDirectory: '../priv/static',
              buildDirectory: 'assets',
              hotFile: '../priv/hot',
              manifestPath: '../priv/static/assets/manifest.json',#{additional_opts}
            })
          ]),#{build_ssr_server_config()}#{build_resolve_config(options, is_phoenix_1_8, app_name)}
        };
      })
      """
    end

    defp build_quality_config(_options) do
      """
      fmt: {
        ignorePatterns: ['dist/**'],
        singleQuote: true,
        semi: true,
        sortPackageJson: true,
      },
      """
    end

    defp build_ssr_plugins(options) do
      plugins = []

      plugins =
        if options[:react],
          do: plugins ++ ["react(), "],
          else: plugins

      plugins =
        if options[:vue],
          do: plugins ++ ["vue(), "],
          else: plugins

      plugins =
        if options[:svelte],
          do: plugins ++ ["svelte(), "],
          else: plugins

      Enum.join(plugins, "")
    end

    defp build_ssr_server_config() do
      """

          server: {
            host: process.env.VITE_HOST || "127.0.0.1", // Listen on IPv4 for compatibility with Erlang :httpc
            port: parseInt(process.env.VITE_PORT || "5173"),
          },
      """
    end

    defp build_vite_imports(options, has_tailwind) do
      imports = []

      imports =
        if options[:react],
          do: imports ++ ["\nimport react from '@vitejs/plugin-react'"],
          else: imports

      imports =
        if has_tailwind,
          do: imports ++ ["\nimport tailwindcss from '@tailwindcss/vite'"],
          else: imports

      Enum.join(imports)
    end

    defp build_vite_plugins(options, has_tailwind) do
      plugins = []

      plugins = if options[:react], do: plugins ++ ["\n    react(),"], else: plugins
      plugins = if has_tailwind, do: plugins ++ ["\n    tailwindcss(),"], else: plugins

      Enum.join(plugins)
    end

    defp build_input_files(options) do
      typescript = options[:typescript] || false

      entry_extension = if typescript, do: "ts", else: "js"
      "['js/app.#{entry_extension}', 'css/app.css']"
    end

    defp build_additional_options(options) do
      config_items = []
      config_items = maybe_add_config(config_items, "refresh: true", true)
      extension = if options[:typescript], do: "tsx", else: "jsx"

      # Don't add reactRefresh option - @vitejs/plugin-react handles it automatically
      # The phoenix plugin warns if reactRefresh is true but React plugin is not detected,
      # which can cause false warnings during config initialization.

      config_items = maybe_add_config(config_items, "detectTls: true", !!options[:tls])

      config_items =
        if options[:ssr] do
          ssr_config = """
          ssrDev: {
                    enabled: true,
                    path: '/ssr',
                    healthPath: '/ssr-health',
                    entryPoint: './js/ssr.#{extension}',
                    hotFile: '../priv/ssr-hot',
                  }
          """

          [ssr_config | config_items]
        else
          config_items
        end

      case config_items do
        [] -> ""
        items -> "\n" <> Enum.map_join(items, "\n", &"            #{&1},")
      end
    end

    defp build_resolve_config(options, is_phoenix_1_8, app_name) do
      aliases =
        []
        |> maybe_add_config("'@': path.resolve(__dirname, './js')", !!options[:typescript])
        |> maybe_add_config(
          "'phoenix-colocated/#{app_name}': path.resolve(__dirname, `../_build/${process.env.MIX_ENV || 'dev'}/phoenix-colocated/#{app_name}`)",
          is_phoenix_1_8
        )

      case aliases do
        [] ->
          ""

        entries ->
          """

            resolve: {
              alias: {
                #{Enum.join(entries, ",\n        ")}
              }
            }
          """
      end
    end

    defp maybe_add_config(configs, _config, false), do: configs
    defp maybe_add_config(configs, config, true), do: [config | configs]

    def update_package_json(igniter) do
      igniter
      |> detect_project_features()
      |> build_and_write_package_json()
      |> update_vendor_imports()
      |> queue_vite_plus_install()
    end

    @doc "Allows npm 12 to install the first-party GitHub package declared at the project root."
    def update_npmrc(igniter) do
      path = "assets/.npmrc"

      if Igniter.exists?(igniter, path) do
        Igniter.update_file(igniter, path, fn source ->
          content = Rewrite.Source.get(source, :content)
          Rewrite.Source.update(source, :content, merge_npmrc(content))
        end)
      else
        Igniter.create_new_file(igniter, path, "allow-git=root\n", on_exists: :skip)
      end
    end

    @doc false
    def merge_npmrc(content) when is_binary(content) do
      allow_git_pattern = ~r/^(?!\s*[#;])\s*allow-git\s*=.*$/m

      if Regex.match?(allow_git_pattern, content) do
        Regex.replace(allow_git_pattern, content, "allow-git=root")
      else
        separator = if content == "" or String.ends_with?(content, "\n"), do: "", else: "\n"
        content <> separator <> "allow-git=root\n"
      end
    end

    defp detect_project_features(igniter) do
      {igniter, has_tailwind} = detect_tailwind(igniter)
      {igniter, has_topbar} = detect_topbar(igniter)
      {igniter, has_daisyui} = detect_daisyui(igniter)

      features = %{
        react: false,
        typescript: igniter.args.options[:typescript] || false,
        ssr: false,
        tailwind: has_tailwind,
        topbar: has_topbar,
        daisyui: has_daisyui
      }

      Igniter.assign(igniter, :detected_features, features)
    end

    defp build_and_write_package_json(igniter) do
      features = igniter.assigns[:detected_features]
      app_name = Igniter.Project.Application.app_name(igniter) |> to_string()

      generated =
        package_json(features, app_name)
        |> put_in(
          ["devDependencies", "@nordbeam/nb-vite"],
          nb_vite_client_package_source(igniter)
        )

      path = "assets/package.json"

      if Igniter.exists?(igniter, path) do
        Igniter.update_file(igniter, path, fn source ->
          content = Rewrite.Source.get(source, :content)

          case Jason.decode(content) do
            {:ok, existing} when is_map(existing) ->
              migrated = merge_package_json(existing, generated)
              Rewrite.Source.update(source, :content, Jason.encode!(migrated, pretty: true))

            _ ->
              {:warning,
               "Could not migrate #{path}: it is not valid JSON. Vite+ dependencies and scripts were not changed."}
          end
        end)
      else
        Igniter.create_new_file(igniter, path, Jason.encode!(generated, pretty: true),
          on_exists: :skip
        )
      end
    end

    @doc "Builds the package manifest emitted by the Vite+ installer."
    def package_json(features, app_name) when is_map(features) and is_binary(app_name) do
      vite_plus_versions = VitePlusIntegration.versions()

      scripts =
        %{
          "dev" => "vp dev",
          "build" => "vp build",
          "preview" => "vp preview",
          "check" => "vp check",
          "check:fix" => "vp check --fix",
          "types:check" => if(features.typescript, do: "tsc --noEmit", else: nil),
          "test" => "vp test --passWithNoTests"
        }
        |> Map.reject(fn {_key, value} -> is_nil(value) end)

      %{
        "name" => app_name,
        "version" => "0.0.0",
        "type" => "module",
        "private" => true,
        "dependencies" => build_dependencies(features),
        "devDependencies" => build_dev_dependencies(features),
        "overrides" => %{
          "vite" => vite_plus_versions.vite_core,
          "vitest" => vite_plus_versions.vitest
        },
        "engines" => %{"node" => ">=20.19.0"},
        "packageManager" => "npm@12.0.2",
        "devEngines" => %{
          "packageManager" => %{
            "name" => "npm",
            "version" => "12.0.2",
            "onFail" => "download"
          }
        },
        "scripts" => scripts
      }
    end

    @doc "Merges Vite+ requirements into an existing assets package manifest."
    def merge_package_json(existing, generated) when is_map(existing) and is_map(generated) do
      existing
      |> Map.put_new("name", generated["name"])
      |> Map.put_new("version", generated["version"])
      |> Map.put("type", generated["type"])
      |> Map.put_new("private", generated["private"])
      |> merge_json_object("dependencies", generated)
      |> merge_json_object("devDependencies", generated)
      |> merge_json_object("overrides", generated)
      |> merge_json_object("engines", generated)
      |> merge_json_object("scripts", generated)
      |> merge_package_manager(generated)
    end

    defp merge_package_manager(existing, generated) do
      package_manager = existing["packageManager"]

      engine_name =
        case existing["devEngines"] do
          %{"packageManager" => %{"name" => name}} when is_binary(name) -> name
          _ -> nil
        end

      cond do
        is_binary(package_manager) and package_manager != "npm" and
            not String.starts_with?(package_manager, "npm@") ->
          existing

        is_nil(package_manager) and is_binary(engine_name) and engine_name != "npm" ->
          existing

        true ->
          existing
          |> Map.put("packageManager", generated["packageManager"])
          |> merge_json_object("devEngines", generated)
      end
    end

    @doc false
    def nb_vite_client_package_source(igniter) do
      case Igniter.Project.Deps.get_dep(igniter, :nb_vite) do
        {:ok, dep_declaration} when is_binary(dep_declaration) ->
          npm_source_from_dep_declaration(
            dep_declaration,
            "git+https://github.com/nordbeam/nb_vite.git"
          )

        _ ->
          "git+https://github.com/nordbeam/nb_vite.git"
      end
    end

    @doc false
    def npm_source_from_dep_declaration(dep_declaration, default_source) do
      dep_declaration
      |> Code.eval_string()
      |> elem(0)
      |> nb_vite_dep_source(default_source)
    rescue
      _ -> default_source
    end

    defp nb_vite_dep_source({_, opts}, default_source) when is_list(opts),
      do: nb_vite_dep_opts_source(opts, default_source)

    defp nb_vite_dep_source({_, _version, opts}, default_source) when is_list(opts),
      do: nb_vite_dep_opts_source(opts, default_source)

    defp nb_vite_dep_source(_, default_source), do: default_source

    defp nb_vite_dep_opts_source(opts, default_source) do
      cond do
        is_binary(opts[:path]) ->
          "file:#{opts[:path] |> Path.expand() |> Path.join("priv/nb_vite")}"

        is_binary(opts[:github]) ->
          github_npm_source(opts[:github], git_ref_suffix(opts))

        is_binary(opts[:git]) ->
          "#{opts[:git]}#{git_ref_suffix(opts)}"

        true ->
          default_source
      end
    end

    defp git_ref_suffix(opts) do
      case opts[:ref] || opts[:tag] || opts[:branch] do
        ref when is_binary(ref) and ref != "" -> "##{ref}"
        _ -> ""
      end
    end

    defp github_npm_source(repository, suffix) do
      repository = String.trim_trailing(repository, ".git")
      "git+https://github.com/#{repository}.git#{suffix}"
    end

    defp merge_json_object(package_json, key, generated) do
      current = package_json |> Map.get(key, %{}) |> ensure_json_object()
      required = generated |> Map.get(key, %{}) |> ensure_json_object()
      Map.put(package_json, key, Map.merge(current, required))
    end

    defp ensure_json_object(value) when is_map(value), do: value
    defp ensure_json_object(_value), do: %{}

    defp build_dependencies(features) do
      deps = %{
        "phoenix" => "^1.8.13",
        "phoenix_html" => "^4.3.0",
        "phoenix_live_view" => "^1.2.11"
      }

      deps = if features.topbar, do: Map.put(deps, "topbar", "^3.0.1"), else: deps

      deps =
        if features.tailwind do
          Map.merge(deps, %{
            "@tailwindcss/vite" => "^4.3.3",
            "tailwindcss" => "^4.3.3"
          })
        else
          deps
        end

      deps = if features.daisyui, do: Map.put(deps, "daisyui", "latest"), else: deps

      if features.react do
        Map.merge(deps, %{
          "react" => "^19.2.8",
          "react-dom" => "^19.2.8",
          "@vitejs/plugin-react" => "^6.1.1"
        })
      else
        deps
      end
    end

    defp build_dev_dependencies(features) do
      vite_plus_versions = VitePlusIntegration.versions()

      dev_deps = %{
        "vite" => vite_plus_versions.vite_core,
        "vite-plus" => vite_plus_versions.vite_plus,
        "@nordbeam/nb-vite" => "git+https://github.com/nordbeam/nb_vite.git",
        "@types/phoenix" => "^1.6.7"
      }

      dev_deps =
        if features.typescript do
          # Vite+ currently bundles a newer TypeScript toolchain, but the
          # plugin's declaration build remains compatible with TypeScript 5.9.
          Map.put(dev_deps, "typescript", "^5.9.3")
        else
          dev_deps
        end

      if features.react && features.typescript do
        Map.merge(dev_deps, %{
          "@types/react" => "^19.2.18",
          "@types/react-dom" => "^19.2.5"
        })
      else
        dev_deps
      end
    end

    def update_vendor_imports(igniter) do
      features = igniter.assigns[:detected_features]

      igniter
      |> maybe_update_topbar_imports(features.topbar)
      |> maybe_update_daisyui_imports(features.daisyui)
    end

    defp maybe_update_topbar_imports(igniter, true) do
      igniter
      |> update_js_for_npm_topbar()
      |> remove_vendored_topbar()
    end

    defp maybe_update_topbar_imports(igniter, false), do: igniter

    defp maybe_update_daisyui_imports(igniter, true) do
      igniter
      |> update_css_for_npm_daisyui()
      |> remove_vendored_daisyui()
    end

    defp maybe_update_daisyui_imports(igniter, false), do: igniter

    defp queue_vite_plus_install(igniter) do
      # Keep installation working on machines without a global `vp`. The
      # command resolves global and project-local CLIs first, then falls back
      # to the pinned npm exec bootstrap.
      Igniter.add_task(igniter, "cmd", [VitePlusIntegration.install_command()])
    end

    def remove_old_watchers(igniter) do
      case Igniter.Libs.Phoenix.select_endpoint(igniter) do
        {igniter, nil} ->
          igniter

        {igniter, endpoint} ->
          app_name = Igniter.Project.Application.app_name(igniter)

          # We need to update the watchers configuration by removing specific keys
          case Igniter.Project.Config.configure(
                 igniter,
                 "dev.exs",
                 app_name,
                 [endpoint, :watchers],
                 {:code,
                  quote do
                    []
                  end},
                 updater: fn zipper ->
                   # Remove esbuild and tailwind entries from the keyword list
                   case Igniter.Code.Keyword.remove_keyword_key(zipper, :esbuild) do
                     {:ok, zipper} ->
                       case Igniter.Code.Keyword.remove_keyword_key(zipper, :tailwind) do
                         {:ok, zipper} -> {:ok, zipper}
                         :error -> {:ok, zipper}
                       end

                     :error ->
                       {:ok, zipper}
                   end
                 end
               ) do
            {:error, igniter} ->
              Igniter.add_warning(
                igniter,
                "Could not remove old watchers from dev.exs. You may want to manually remove :esbuild and :tailwind watchers."
              )

            result ->
              result
          end
      end
    end

    def update_root_layout(igniter) do
      file_path =
        Path.join([
          "lib",
          web_dir(igniter),
          "components",
          "layouts",
          "root.html.heex"
        ])

      typescript = igniter.args.options[:typescript] || false

      # Determine the correct app file extension (only js or ts, no jsx/tsx)
      app_ext = if typescript, do: "ts", else: "js"

      # Update the regular root.html.heex with simplified Vite helpers
      igniter
      |> Igniter.include_existing_file(file_path)
      |> Igniter.update_file(file_path, fn source ->
        Rewrite.Source.update(source, :content, fn
          content when is_binary(content) ->
            if String.contains?(content, "NbVite.vite_") or
                 String.contains?(content, "Vite.vite_") do
              # Already configured
              content
            else
              # Replace Phoenix asset helpers with Vite helpers
              updated =
                content
                # First, try to replace the combined CSS and JS pattern (common in phx.new projects)
                |> String.replace(
                  ~r/(\s*)<link[^>]+href={~p"\/assets\/app\.css"}[^>]*>\s*\n\s*<script[^>]+src={~p"\/assets\/app\.js"}[^>]*>\s*\n\s*<\/script>/,
                  "\\1<%= NbVite.vite_client() %>\n\n\\1<%= NbVite.vite_assets(\"css/app.css\") %>\n\n\\1<%= NbVite.vite_assets(\"js/app.#{app_ext}\") %>"
                )
                # Pattern 1: CSS link with ~p sigil (handles /assets/css/app.css path)
                |> String.replace(
                  ~r/<link[^>]+href={~p"\/assets\/css\/app\.css"}[^>]*>/,
                  "<%= NbVite.vite_assets(\"css/app.css\") %>"
                )
                # Pattern 2: JS script with ~p sigil (handles /assets/js/app.js path)
                |> String.replace(
                  ~r/<script[^>]+src={~p"\/assets\/js\/app\.js"}[^>]*>\s*<\/script>/,
                  "<%= NbVite.vite_assets(\"js/app.#{app_ext}\") %>"
                )
                # Pattern 3: Legacy patterns for older Phoenix apps
                |> String.replace(
                  ~r/<link[^>]+href={~p"\/assets\/app\.css"}[^>]*>/,
                  "<%= NbVite.vite_assets(\"css/app.css\") %>"
                )
                |> String.replace(
                  ~r/<script[^>]+src={~p"\/assets\/app\.js"}[^>]*>\s*<\/script>/,
                  "<%= NbVite.vite_assets(\"js/app.#{app_ext}\") %>"
                )
                # Pattern 4: Routes.static_path pattern (older Phoenix)
                |> String.replace(
                  ~r/<link[^>]+href={Routes\.static_path\(@conn,\s*"\/assets\/app\.css"\)}[^>]*>/,
                  "<%= NbVite.vite_assets(\"css/app.css\") %>"
                )
                |> String.replace(
                  ~r/<script[^>]+src={Routes\.static_path\(@conn,\s*"\/assets\/app\.js"\)}[^>]*>\s*<\/script>/,
                  "<%= NbVite.vite_assets(\"js/app.#{app_ext}\") %>"
                )

              # Add vite_client if not already present and we made replacements
              # Only needed if the combined pattern didn't match
              if not String.contains?(updated, "vite_client") and updated != content do
                String.replace(
                  updated,
                  ~r/(\s*)(<%= NbVite\.vite_assets\("css\/app\.css"\) %>)/,
                  "\\1<%= NbVite.vite_client() %>\n\n\\1\\2",
                  global: false
                )
              else
                updated
              end
            end

          content ->
            content
        end)
      end)
    end

    defp web_dir(igniter) do
      "#{Igniter.Project.Application.app_name(igniter)}_web"
    end

    defp detect_phoenix_1_8(igniter) do
      case Igniter.Project.Deps.get_dep(igniter, :phoenix) do
        {:ok, dep_spec} when is_binary(dep_spec) ->
          # Parse version requirement to check if it's Phoenix 1.8 specifically
          is_phoenix_1_8 = is_phoenix_1_8?(dep_spec)
          Igniter.assign(igniter, :is_phoenix_1_8, is_phoenix_1_8)

        _ ->
          # If we can't determine, assume it's not Phoenix 1.8
          Igniter.assign(igniter, :is_phoenix_1_8, false)
      end
    end

    def is_phoenix_1_8?(igniter) when is_struct(igniter) do
      # Retrieve from cached value if already detected
      case Map.get(igniter.assigns, :is_phoenix_1_8) do
        nil -> false
        value -> value
      end
    end

    def is_phoenix_1_8?(version_spec) when is_binary(version_spec) do
      # Check if the version specification indicates Phoenix 1.8 specifically
      # Phoenix 1.8 is when colocated hooks were introduced
      cond do
        # Check for exact versions or ranges that include 1.8
        String.contains?(version_spec, "~> 1.8") -> true
        String.contains?(version_spec, ">= 1.8.0") -> true
        String.contains?(version_spec, "== 1.8") -> true
        # If no patterns match, it's not Phoenix 1.8
        true -> false
      end
    end

    def setup_assets(igniter) do
      typescript = igniter.args.options[:typescript] || false

      igniter
      |> create_app_js(typescript)
      |> create_app_css()
      |> move_colocated_css_import_to_javascript(typescript)
      |> maybe_create_typescript_config(typescript)
    end

    defp create_app_js(igniter, typescript) do
      # For standard nb_vite, only handle TypeScript conversion if needed
      # React files will be created by nb_inertia
      if typescript && Igniter.exists?(igniter, "assets/js/app.js") do
        # Rename app.js to app.ts when TypeScript is enabled
        Igniter.move_file(igniter, "assets/js/app.js", "assets/js/app.ts", on_exists: :skip)
      else
        igniter
      end
    end

    defp create_app_css(igniter) do
      # Ensure css/app.css exists - Phoenix 1.8 may not create this file
      css_path = "assets/css/app.css"

      if Igniter.exists?(igniter, css_path) do
        igniter
      else
        content = """
        /* NB Vite - CSS Entry Point */
        /* Import your styles here */
        """

        Igniter.create_new_file(igniter, css_path, content, on_exists: :skip)
      end
    end

    defp move_colocated_css_import_to_javascript(igniter, typescript) do
      app_name = igniter |> Igniter.Project.Application.app_name() |> to_string()
      css_import = "phoenix-colocated/#{app_name}/colocated.css"
      entry_path = if typescript, do: "assets/js/app.ts", else: "assets/js/app.js"

      igniter =
        if Igniter.exists?(igniter, "assets/css/app.css") do
          igniter
          |> Igniter.include_existing_file("assets/css/app.css")
          |> Igniter.update_file("assets/css/app.css", fn source ->
            Rewrite.Source.update(source, :content, fn content ->
              String.replace(
                content,
                ~r/^\s*@import\s+["']#{Regex.escape(css_import)}["'];?\s*\n/m,
                ""
              )
            end)
          end)
        else
          igniter
        end

      if Igniter.exists?(igniter, entry_path) do
        igniter
        |> Igniter.include_existing_file(entry_path)
        |> Igniter.update_file(entry_path, fn source ->
          Rewrite.Source.update(source, :content, fn content ->
            if String.contains?(content, css_import) do
              content
            else
              ~s(import "#{css_import}";) <> "\n" <> content
            end
          end)
        end)
      else
        igniter
      end
    end

    defp maybe_create_typescript_config(igniter, false), do: igniter

    defp maybe_create_typescript_config(igniter, true) do
      # For standard nb_vite, use basic TypeScript config
      # React-specific tsconfig will be handled by nb_inertia
      config = basic_tsconfig_json()

      Igniter.create_new_file(igniter, "assets/tsconfig.json", config, on_exists: :skip)
    end

    defp basic_tsconfig_json do
      """
      {
        "compilerOptions": {
          "paths": {
            "@/*": ["./js/*"]
          },
          "target": "ES2020",
          "useDefineForClassFields": true,
          "module": "ESNext",
          "lib": ["ES2020", "DOM", "DOM.Iterable"],
          "skipLibCheck": true,
          "moduleResolution": "bundler",
          "allowImportingTsExtensions": true,
          "resolveJsonModule": true,
          "isolatedModules": true,
          "moduleDetection": "force",
          "noEmit": true,
          "strict": true,
          "noUnusedLocals": true,
          "noUnusedParameters": true,
          "noFallthroughCasesInSwitch": true,
          "noUncheckedSideEffectImports": true
        },
        "include": ["js/**/*"]
      }
      """
    end

    defp detect_topbar(igniter) do
      # Check if app.js imports topbar from vendor
      # This runs BEFORE setup_assets, so the file is still app.js
      app_js_path = "assets/js/app.js"

      if Igniter.exists?(igniter, app_js_path) do
        updated_igniter = Igniter.include_existing_file(igniter, app_js_path)
        source = Rewrite.source!(updated_igniter.rewrite, app_js_path)
        content = Rewrite.Source.get(source, :content)

        has_topbar_import = String.contains?(content, "../vendor/topbar")

        has_vendored_topbar =
          Igniter.exists?(updated_igniter, "assets/vendor/topbar.js")

        {updated_igniter, has_topbar_import || has_vendored_topbar}
      else
        {igniter, false}
      end
    end

    defp update_js_for_npm_topbar(igniter) do
      # Update app.js - this runs BEFORE setup_assets renames it to app.ts
      js_path = "assets/js/app.js"

      if Igniter.exists?(igniter, js_path) do
        update_topbar_imports_in_file(igniter, js_path)
      else
        igniter
      end
    end

    defp update_topbar_imports_in_file(igniter, file_path) do
      igniter
      |> Igniter.include_existing_file(file_path)
      |> Igniter.update_file(file_path, fn source ->
        Rewrite.Source.update(source, :content, fn
          content when is_binary(content) ->
            # Replace vendored topbar import with npm version
            content
            |> String.replace(
              ~r/import\s+topbar\s+from\s+"\.\.\/vendor\/topbar"/,
              "import topbar from \"topbar\""
            )
            |> String.replace(
              ~r/import\s+topbar\s+from\s+'\.\.\/vendor\/topbar'/,
              "import topbar from \"topbar\""
            )

          content ->
            content
        end)
      end)
    end

    defp remove_vendored_topbar(igniter) do
      vendored_file = "assets/vendor/topbar.js"

      if Igniter.exists?(igniter, vendored_file) do
        Igniter.rm(igniter, vendored_file)
      else
        igniter
      end
    end

    defp detect_daisyui(igniter) do
      app_css_path = "assets/css/app.css"

      # Check if app.css exists and contains daisyUI references
      has_daisyui_in_css =
        if Igniter.exists?(igniter, app_css_path) do
          updated_igniter = Igniter.include_existing_file(igniter, app_css_path)

          source = Rewrite.source!(updated_igniter.rewrite, app_css_path)
          content = Rewrite.Source.get(source, :content)
          has_daisyui = String.contains?(content, "daisyui")
          {updated_igniter, has_daisyui}
        else
          {igniter, false}
        end

      # Check for vendored daisyUI files
      {igniter, has_css} = has_daisyui_in_css

      has_vendored_daisyui =
        Igniter.exists?(igniter, "assets/vendor/daisyui.js") ||
          Igniter.exists?(igniter, "assets/vendor/daisyui-theme.js")

      {igniter, has_css || has_vendored_daisyui}
    end

    defp update_css_for_npm_daisyui(igniter) do
      app_css_path = "assets/css/app.css"

      if Igniter.exists?(igniter, app_css_path) do
        igniter
        |> Igniter.include_existing_file(app_css_path)
        |> Igniter.update_file(app_css_path, fn source ->
          Rewrite.Source.update(source, :content, fn
            content when is_binary(content) ->
              # Replace vendored daisyUI imports with npm version
              content
              |> String.replace(
                ~r/@plugin\s+["']daisyui\/packages\/bundle\/daisyui-theme["']/,
                ~s(@plugin "daisyui/theme")
              )
              |> String.replace(
                ~r/@plugin\s+["']daisyui\/packages\/bundle\/daisyui["']/,
                ~s(@plugin "daisyui")
              )
              |> String.replace(~r/@plugin\s+"\.\.\/vendor\/daisyui"/, "@plugin \"daisyui\"")
              |> String.replace(
                ~r/@plugin\s+"\.\.\/vendor\/daisyui-theme"/,
                "@plugin \"daisyui/theme\""
              )
              |> String.replace(~r/@plugin\s+'\.\.\/vendor\/daisyui'/, "@plugin \"daisyui\"")
              |> String.replace(
                ~r/@plugin\s+'\.\.\/vendor\/daisyui-theme'/,
                "@plugin \"daisyui/theme\""
              )

            content ->
              content
          end)
        end)
      else
        igniter
      end
    end

    defp remove_vendored_daisyui(igniter) do
      vendored_files = [
        "assets/vendor/daisyui.js",
        "assets/vendor/daisyui-theme.js"
      ]

      Enum.reduce(vendored_files, igniter, fn file, acc_igniter ->
        if Igniter.exists?(acc_igniter, file) do
          Igniter.rm(acc_igniter, file)
        else
          acc_igniter
        end
      end)
    end

    def print_next_steps(igniter) do
      notices = build_installation_notices(igniter.args.options)

      Enum.reduce(notices, igniter, fn notice, acc ->
        Igniter.add_notice(acc, notice)
      end)
    end

    defp build_installation_notices(options) do
      base_notice = """
      Phoenix Vite+ has been installed! Here are the next steps:

      1. Vite+ is now configured as your asset watcher
      2. Your root layout has been updated to use Vite helpers
      3. Run `mix phx.server` to start development with hot module reloading
      """

      notices = [base_notice]
      notices = maybe_add_typescript_notice(notices, options)
      notices = maybe_add_inertia_notice(notices, options)

      notices ++ [build_documentation_notice()]
    end

    defp maybe_add_typescript_notice(notices, %{typescript: true}) do
      notice = """
      TypeScript Configuration:
      - TypeScript is configured with strict mode
      - Your app.js has been created as app.ts
      - Type checking happens in your editor (Vite skips it for speed)
      """

      notices ++ [notice]
    end

    defp maybe_add_typescript_notice(notices, _), do: notices

    defp maybe_add_inertia_notice(notices, options) when is_list(options) do
      if Keyword.get(options, :inertia, false) do
        config_notes = build_inertia_config_notes(options)
        extra_config = if config_notes != [], do: "\n" <> Enum.join(config_notes, "\n"), else: ""

        typescript = Keyword.get(options, :typescript, false)

        notice = """
        Inertia.js Configuration:
        - Inertia.js has been configured with React and code splitting
        - Create page components in assets/js/pages/
        - In your controllers, use `assign_prop(conn, :prop, ...) |> render_inertia("PageName")`
        - The Inertia plug and helpers have been added to your application
        - Example page created at assets/js/pages/Home.#{if typescript, do: "tsx", else: "jsx"}#{extra_config}

        To test your setup:
        1. Update a controller action to use Inertia:
           ```elixir
           def index(conn, _params) do
            assign_prop(conn, :greeting, "Hello from Inertia!")
            |> render_inertia("Home")
           end
           ```
        2. Run `mix phx.server` and visit the route
        """

        notices ++ [notice]
      else
        notices
      end
    end

    defp maybe_add_inertia_notice(notices, _), do: notices

    defp build_inertia_config_notes(options) do
      notes = []

      notes =
        if Keyword.get(options, :camelize_props, false) do
          notes ++ ["- Props will be automatically camelized (snake_case → camelCase)"]
        else
          notes
        end

      if Keyword.get(options, :history_encrypt, false) do
        notes ++ ["- Browser history encryption is enabled for security"]
      else
        notes
      end
    end

    defp build_documentation_notice do
      """
      For more information, see:
      https://github.com/nordbeam/nb_vite
      """
    end
  end
else
  # Fallback if Igniter is not installed
  defmodule Mix.Tasks.NbVite.Install do
    @shortdoc "Installs Phoenix Vite | Install `igniter` to use"
    @moduledoc """
    The task 'nb_vite.install' requires igniter for advanced installation features.

    You can still set up Phoenix Vite using:

        mix nb_vite.setup

    Add to your mix.exs for direct task usage:

        {:igniter, "~> 0.7", only: [:dev, :test]}

    Or install Igniter first and use the preferred installer flow:

        mix igniter.install nb_vite

    Then run:

        mix deps.get
        mix nb_vite.install
    """

    use Mix.Task

    def run(_argv) do
      Mix.shell().error("""
      The task 'nb_vite.install' requires igniter for automatic installation.

      Add to your mix.exs for direct task usage:

          {:igniter, "~> 0.7", only: [:dev, :test]}

      Or install Igniter first and use the preferred installer flow:

          mix igniter.install nb_vite
      """)

      exit({:shutdown, 1})
    end
  end
end
