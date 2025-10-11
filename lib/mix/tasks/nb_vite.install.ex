if Code.ensure_loaded?(Igniter) do
  defmodule Mix.Tasks.NbVite.Install do
    @moduledoc """
    Installs and configures Phoenix Vite in a Phoenix application using Igniter.

    This installer:
    1. Creates vite.config.js with appropriate configuration
    2. Updates package.json with Vite dependencies and scripts
    3. Adds the Vite watcher to the development configuration
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
    require Igniter.Code.Common

    alias Mix.Tasks.NbVite.Install.BunIntegration

    @impl Igniter.Mix.Task
    def info(_argv, _parent) do
      %Igniter.Mix.Task.Info{
        schema: [
          typescript: :boolean,
          tls: :boolean,
          yes: :boolean
        ],
        defaults: [],
        positional: [],
        composes: ["deps.get"]
      }
    end

    @impl Igniter.Mix.Task
    def igniter(igniter) do
      # Check if Phoenix 1.8 is being used (for colocated hooks support)
      igniter = detect_phoenix_1_8(igniter)

      igniter
      |> BunIntegration.integrate()
      |> setup_html_helpers()
      |> create_vite_config()
      |> update_package_json()
      |> setup_watcher_for_system_package_managers()
      |> remove_old_watchers()
      |> update_root_layout()
      |> setup_assets()
      |> update_mix_aliases_for_system_package_managers()
      |> print_next_steps()
    end

    # Bun integration is now handled by BunIntegration.integrate/1

    # Test helpers - these delegate to the appropriate functions
    def update_mix_aliases(igniter) do
      if BunIntegration.using_bun?(igniter) do
        BunIntegration.integrate(igniter)
      else
        update_mix_aliases_for_system_package_managers(igniter)
      end
    end

    def setup_watcher(igniter) do
      if BunIntegration.using_bun?(igniter) do
        BunIntegration.integrate(igniter)
      else
        setup_watcher_for_system_package_managers(igniter)
      end
    end

    def maybe_add_bun_dep(igniter) do
      BunIntegration.integrate(igniter)
    end

    def maybe_setup_bun_config(igniter) do
      BunIntegration.integrate(igniter)
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

      # No longer need to copy the phoenix plugin - it's available via npm workspace

      # Only pass typescript option for standard vite config - react and ssr are handled by nb_inertia
      simplified_options = %{typescript: igniter.args.options[:typescript]}
      config = build_vite_config(simplified_options, has_tailwind, is_phoenix_1_8, app_name)

      Igniter.create_new_file(igniter, "assets/vite.config.js", config, on_exists: :skip)
    end

    defp copy_phoenix_plugin(igniter) do
      # Read the phoenix plugin from nb_vite priv directory
      priv_dir = :code.priv_dir(:nb_vite)
      plugin_source = Path.join([priv_dir, "static", "nb_vite", "index.js"])
      html_source = Path.join([priv_dir, "static", "nb_vite", "dev-server-index.html"])

      # Copy phoenix plugin to assets/vite-plugins/phoenix.js
      igniter =
        case File.read(plugin_source) do
          {:ok, content} ->
            Igniter.create_new_file(igniter, "assets/vite-plugins/phoenix.js", content,
              on_exists: :overwrite
            )

          {:error, _} ->
            Igniter.add_warning(
              igniter,
              "Could not find phoenix plugin at #{plugin_source}. The plugin may need to be copied manually."
            )
        end

      # Copy dev-server-index.html to assets/vite-plugins/
      case File.read(html_source) do
        {:ok, content} ->
          Igniter.create_new_file(igniter, "assets/vite-plugins/dev-server-index.html", content,
            on_exists: :overwrite
          )

        {:error, _} ->
          Igniter.add_warning(
            igniter,
            "Could not find dev-server-index.html at #{html_source}. The file may need to be copied manually."
          )
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

      path_import =
        if options[:shadcn] || is_phoenix_1_8 || true, do: "\nimport path from 'path'", else: ""

      """
      import { defineConfig } from 'vite'
      import { phoenix } from 'nb_vite'#{path_import}#{imports}

      export default defineConfig({
        plugins: [#{plugins}
          phoenix({
            input: #{input_files},
            publicDirectory: '../priv/static',
            buildDirectory: 'assets',
            hotFile: '../priv/hot',
            manifestPath: '../priv/static/assets/manifest.json',#{additional_opts}
          })
        ],#{build_resolve_config(options, is_phoenix_1_8, app_name)}
      })
      """
    end

    defp build_ssr_vite_config(options, has_tailwind, is_phoenix_1_8, app_name) do
      imports = build_vite_imports(options, has_tailwind)
      plugins = build_vite_plugins(options, has_tailwind)
      input_files = build_input_files(options)
      additional_opts = build_additional_options(options)
      extension = if options[:typescript], do: "tsx", else: "jsx"

      path_import =
        if options[:shadcn] || is_phoenix_1_8 || true, do: "\nimport path from 'path'", else: ""

      """
      import { defineConfig } from 'vite'
      import { phoenix } from 'nb_vite'#{path_import}#{imports}
      import nodePrefixPlugin from './vite-plugins/node-prefix-plugin.js'

      export default defineConfig(({ command, mode, isSsrBuild }) => {
        const isSSR = isSsrBuild || process.env.BUILD_SSR === "true";

        if (isSSR) {
          // SSR build configuration for Deno compatibility
          return {
            plugins: [#{build_ssr_plugins(options)}nodePrefixPlugin()],
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
          plugins: [#{plugins}
            phoenix({
              input: #{input_files},
              publicDirectory: '../priv/static',
              buildDirectory: 'assets',
              hotFile: '../priv/hot',
              manifestPath: '../priv/static/assets/manifest.json',#{additional_opts}
            })
          ],#{build_ssr_server_config()}#{build_resolve_config(options, is_phoenix_1_8, app_name)}
        };
      })
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

    defp determine_entry_extension(typescript, react) do
      cond do
        react && typescript -> "tsx"
        react -> "jsx"
        typescript -> "ts"
        true -> "js"
      end
    end

    defp determine_app_extension(typescript, _react) do
      # For root.html.heex, we always use app.js or app.ts
      # The JSX/TSX files are separate entry points for React
      if typescript, do: "ts", else: "js"
    end

    defp build_additional_options(options) do
      config_items = []
      config_items = maybe_add_config(config_items, "refresh: true", true)

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
                    entryPoint: './js/ssr_dev.tsx',
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

    defp build_resolve_config(options, _is_phoenix_1_8, _app_name) do
      # The phoenix-colocated alias is now handled by the Vite plugin itself
      if options[:typescript] do
        """

          resolve: {
            alias: {
              '@': path.resolve(__dirname, './js')
            }
          }
        """
      else
        # No resolve configuration needed by default
        ""
      end
    end

    defp maybe_add_config(configs, _config, false), do: configs
    defp maybe_add_config(configs, config, true), do: [config | configs]

    def update_package_json(igniter) do
      igniter
      |> detect_project_features()
      |> build_and_write_package_json()
      |> update_vendor_imports()
      |> queue_npm_install()
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

      dependencies = build_dependencies(features)
      dev_dependencies = build_dev_dependencies(features)

      package_json = %{
        "name" => Igniter.Project.Application.app_name(igniter) |> to_string(),
        "version" => "0.0.0",
        "type" => "module",
        "private" => true,
        "workspaces" => ["../deps/*"],
        "dependencies" => dependencies,
        "devDependencies" => dev_dependencies,
        "scripts" => %{
          "dev" => "vite",
          "build" => "vite build"
        }
      }

      # Add Bun workspaces for Phoenix JS libraries if needed
      package_json = BunIntegration.update_package_json(package_json, igniter)

      content = Jason.encode!(package_json, pretty: true)

      Igniter.create_new_file(igniter, "assets/package.json", content, on_exists: :skip)
    end

    defp build_dependencies(features) do
      deps = %{
        "vite" => "^7.0.0",
        "nb_vite" => "workspace:*"
      }

      deps = if features.topbar, do: Map.put(deps, "topbar", "^3.0.0"), else: deps

      deps =
        if features.tailwind do
          Map.merge(deps, %{
            "@tailwindcss/vite" => "^4.1.0",
            "tailwindcss" => "^4.1.0"
          })
        else
          deps
        end

      deps = if features.daisyui, do: Map.put(deps, "daisyui", "latest"), else: deps

      if features.react do
        Map.merge(deps, %{
          "react" => "^19.1.0",
          "react-dom" => "^19.1.0",
          "@vitejs/plugin-react" => "^4.3.4"
        })
      else
        deps
      end
    end

    defp build_dev_dependencies(features) do
      dev_deps = %{"@types/phoenix" => "^1.6.0"}

      dev_deps =
        if features.typescript do
          Map.put(dev_deps, "typescript", "^5.7.2")
        else
          dev_deps
        end

      dev_deps =
        if features.ssr do
          Map.put(dev_deps, "vite-node", "^3.0.0")
        else
          dev_deps
        end

      if features.react && features.typescript do
        Map.merge(dev_deps, %{
          "@types/react" => "^19.1.0",
          "@types/react-dom" => "^19.1.0"
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

    defp queue_npm_install(igniter) do
      case BunIntegration.install_command(igniter) do
        nil ->
          # Bun handles its own installation
          igniter

        install_cmd ->
          Igniter.add_task(igniter, "cmd", [install_cmd])
      end
    end

    def setup_watcher_for_system_package_managers(igniter) do
      # Bun watcher is handled by BunIntegration
      if BunIntegration.using_bun?(igniter) do
        igniter
      else
        case Igniter.Libs.Phoenix.select_endpoint(igniter) do
          {igniter, nil} ->
            Igniter.add_warning(
              igniter,
              "Could not find Phoenix endpoint. Vite watcher was not configured. You may need to manually add the Vite watcher to your dev.exs configuration."
            )

          {igniter, endpoint} ->
            app_name = Igniter.Project.Application.app_name(igniter)
            is_phoenix_1_8 = is_phoenix_1_8?(igniter)
            phoenix_version = if is_phoenix_1_8, do: "1.8", else: "1.7"

            # Use Vite directly with npm/yarn/pnpm
            watcher_value =
              if is_phoenix_1_8 do
                {:code,
                 quote do
                   [
                     "node_modules/.bin/vite",
                     "dev",
                     cd: Path.expand("../assets", __DIR__),
                     env: [
                       {"PHX_BUILD_PATH", Mix.Project.build_path()},
                       {"PHX_APP_NAME", unquote(to_string(app_name))},
                       {"PHX_VERSION", unquote(phoenix_version)}
                     ]
                   ]
                 end}
              else
                {:code,
                 Sourceror.parse_string!("""
                 ["node_modules/.bin/vite", "dev", cd: Path.expand("../assets", __DIR__)]
                 """)}
              end

            case Igniter.Project.Config.configure(
                   igniter,
                   "dev.exs",
                   app_name,
                   [endpoint, :watchers, :node],
                   watcher_value
                 ) do
              {:error, igniter} ->
                Igniter.add_warning(
                  igniter,
                  "Could not configure Vite watcher in dev.exs. You may need to manually add the watcher configuration."
                )

              result ->
                result
            end
        end
      end
    end

    def remove_old_watchers(igniter) do
      case Igniter.Libs.Phoenix.select_endpoint(igniter) do
        {igniter, nil} ->
          # Already warned in setup_watcher_for_system_package_managers
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
      igniter
      |> Igniter.Libs.Phoenix.web_module()
      |> inspect()
      |> Macro.underscore()
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
      # Phoenix always generates app.css, so we don't need to create it
      # Just return the igniter as-is
      igniter
    end

    defp react_app_content(_extension) do
      """
      import React from "react"
      import { createRoot } from "react-dom/client"

      // Phoenix specific imports
      import "phoenix_html"
      import { Socket } from "phoenix"
      import { LiveSocket } from "phoenix_live_view"

      // Example React component
      function App() {
        return (
          <div className="app">
            <h1>Welcome to Phoenix with Vite and React!</h1>
          </div>
        )
      }

      // Mount React app if there's a root element
      const rootElement = document.getElementById("react-root")
      if (rootElement) {
        const root = createRoot(rootElement)
        root.render(<App />)
      }

      // Phoenix LiveView setup
      let csrfToken = document.querySelector("meta[name='csrf-token']")?.getAttribute("content")
      let liveSocket = new LiveSocket("/live", Socket, {
        longPollFallbackMs: 2500,
        params: { _csrf_token: csrfToken }
      })

      // Connect if there are any LiveViews on the page
      liveSocket.connect()

      // Expose liveSocket on window for web console debug logs and latency simulation
      window.liveSocket = liveSocket
      """
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
          "baseUrl": ".",
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

    defp react_tsconfig_json do
      """
      {
        "compilerOptions": {
          "baseUrl": ".",
          "paths": {
            "@/*": ["./js/*"]
          },
          "target": "ES2020",
          "useDefineForClassFields": true,
          "lib": ["ES2020", "DOM", "DOM.Iterable"],
          "module": "ESNext",
          "skipLibCheck": true,
          "moduleResolution": "bundler",
          "allowImportingTsExtensions": true,
          "resolveJsonModule": true,
          "isolatedModules": true,
          "moduleDetection": "force",
          "noEmit": true,
          "jsx": "react-jsx",
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

    def update_mix_aliases_for_system_package_managers(igniter) do
      # Bun aliases are handled by BunIntegration
      if BunIntegration.using_bun?(igniter) do
        igniter
      else
        # Use nb_vite tasks (which detect package manager automatically)
        igniter
        |> Igniter.Project.TaskAliases.modify_existing_alias("assets.setup", fn zipper ->
          {:ok,
           Sourceror.Zipper.replace(
             zipper,
             quote(do: ["nb_vite.install --if-missing", "nb_vite.deps"])
           )}
        end)
        |> Igniter.Project.TaskAliases.modify_existing_alias("assets.build", fn zipper ->
          {:ok, Sourceror.Zipper.replace(zipper, quote(do: ["nb_vite.deps", "nb_vite build"]))}
        end)
        |> Igniter.Project.TaskAliases.modify_existing_alias("assets.deploy", fn zipper ->
          {:ok,
           Sourceror.Zipper.replace(
             zipper,
             quote(do: ["nb_vite.deps", "nb_vite build", "phx.digest"])
           )}
        end)
      end
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

    def maybe_setup_shadcn(igniter) do
      if igniter.args.options[:shadcn] do
        # Queue the shadcn init command to run after npm install
        base_color = igniter.args.options[:base_color] || "neutral"

        # Determine which package manager command to use
        shadcn_cmd =
          case BunIntegration.install_command(igniter) do
            nil ->
              [
                "cmd",
                [
                  "bunx --bun shadcn@latest init -y --base-color #{base_color} --css-variables --cwd assets"
                ]
              ]

            install_cmd when is_binary(install_cmd) ->
              runner =
                cond do
                  install_cmd =~ "bun" -> "bunx"
                  install_cmd =~ "pnpm" -> "pnpm dlx"
                  install_cmd =~ "yarn" -> "yarn dlx"
                  true -> "npx"
                end

              [
                "cmd",
                [
                  "#{runner} shadcn@latest init -y --base-color #{base_color} --css-variables --cwd assets"
                ]
              ]
          end

        Igniter.add_task(igniter, Enum.at(shadcn_cmd, 0), Enum.at(shadcn_cmd, 1))
      else
        igniter
      end
    end

    def print_next_steps(igniter) do
      notices = build_installation_notices(igniter.args.options)

      Enum.reduce(notices, igniter, fn notice, acc ->
        Igniter.add_notice(acc, notice)
      end)
    end

    defp build_installation_notices(options) do
      base_notice = """
      Phoenix Vite has been installed! Here are the next steps:

      1. Vite is now configured as your asset watcher
      2. Your root layout has been updated to use Vite helpers
      3. Run `mix phx.server` to start development with hot module reloading
      """

      notices = [base_notice]
      # Bun notice is now handled by BunIntegration
      notices = maybe_add_typescript_notice(notices, options)
      notices = maybe_add_inertia_notice(notices, options)
      notices = maybe_add_shadcn_notice(notices, options)

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

    defp maybe_add_shadcn_notice(notices, options) do
      if Keyword.get(options, :shadcn) do
        base_color = Keyword.get(options, :base_color, "zinc")

        notice = """
        shadcn/ui Configuration:
        - shadcn/ui has been initialized with the #{base_color} theme
        - Components will be installed in assets/js/components/ui/
        - CSS variables are configured for easy theming
        - Use the cn() utility from @/lib/utils for className merging

        To add components:
          cd assets && npx shadcn@latest add button

        Example usage:
          import { Button } from "@/components/ui/button"

          <Button variant="outline">Click me</Button>
        """

        notices ++ [notice]
      else
        notices
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

    To use the full installer with automatic configuration, install igniter:

        {:igniter, "~> 0.5", only: [:dev]}

    Then run:

        mix deps.get
        mix nb_vite.install
    """

    use Mix.Task

    def run(_argv) do
      Mix.shell().info("""
      The task 'nb_vite.install' requires igniter for automatic installation.
      """)
    end
  end
end
