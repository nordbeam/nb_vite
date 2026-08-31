defmodule Mix.Tasks.NbVite.Install.VitePlusIntegration do
  @moduledoc """
  Integrates Vite+ into a Phoenix application.

  Vite+ is intentionally installed as a development dependency and invoked
  through its `vp` command. Unlike the legacy Bun integration, this module
  does not add a runtime dependency to the Mix project. Dependency installation
  stays with the package manager selected by the project's lockfile.
  """

  @compile {:no_warn_undefined,
            [
              Igniter,
              Igniter.Project.Config,
              Igniter.Project.TaskAliases,
              Igniter.Libs.Phoenix,
              Sourceror.Zipper
            ]}

  @vite_plus_version "0.3.0"
  @vite_core_alias "npm:@voidzero-dev/vite-plus-core@#{@vite_plus_version}"
  @vitest_version "4.1.11"

  @doc "Returns the Vite+ versions used by generated Phoenix projects."
  def versions do
    %{
      vite_plus: @vite_plus_version,
      vite_core: @vite_core_alias,
      vitest: @vitest_version
    }
  end

  @doc "Integrates Vite+ aliases, watcher, and installation guidance."
  def integrate(igniter) do
    igniter
    |> setup_mix_aliases()
    |> setup_watcher()
    |> add_notice()
  end

  @doc "Updates the standard Phoenix asset aliases to invoke Vite+."
  def update_mix_aliases(igniter), do: setup_mix_aliases(igniter)

  @doc "Configures the Phoenix development watcher to invoke Vite+."
  def setup_watcher(igniter), do: configure_watcher(igniter)

  @doc "Returns the dependency-install command for a Phoenix assets project."
  def install_command do
    Elixir.NbVite.VitePlus.install_command()
  end

  defp setup_mix_aliases(igniter) do
    igniter
    |> Igniter.Project.TaskAliases.modify_existing_alias("assets.setup", fn zipper ->
      {:ok, Sourceror.Zipper.replace(zipper, quote(do: ["nb_vite.deps"]))}
    end)
    |> Igniter.Project.TaskAliases.add_alias("assets.setup", ["nb_vite.deps"])
    |> Igniter.Project.TaskAliases.modify_existing_alias("assets.build", fn zipper ->
      {:ok,
       Sourceror.Zipper.replace(
         zipper,
         quote(do: ["compile", "nb_vite.deps", "nb_vite build"])
       )}
    end)
    |> Igniter.Project.TaskAliases.add_alias(
      "assets.build",
      ["compile", "nb_vite.deps", "nb_vite build"]
    )
    |> Igniter.Project.TaskAliases.modify_existing_alias("assets.deploy", fn zipper ->
      {:ok,
       Sourceror.Zipper.replace(
         zipper,
         quote(do: ["compile", "nb_vite.deps", "nb_vite build", "phx.digest"])
       )}
    end)
    |> Igniter.Project.TaskAliases.add_alias(
      "assets.deploy",
      ["compile", "nb_vite.deps", "nb_vite build", "phx.digest"]
    )
  end

  defp configure_watcher(igniter) do
    {igniter, endpoint} = Igniter.Libs.Phoenix.select_endpoint(igniter)
    app_name = Igniter.Project.Application.app_name(igniter)

    watcher_value =
      {:code, Sourceror.parse_string!("{Mix.Tasks.NbVite, :run, [[\"dev\"]]}")}

    Igniter.Project.Config.configure(
      igniter,
      "dev.exs",
      app_name,
      [endpoint, :watchers, :vite],
      watcher_value
    )
  end

  defp add_notice(igniter) do
    Igniter.add_notice(
      igniter,
      """
      Vite+ is configured for the assets project:
      - The Phoenix dev watcher runs `mix nb_vite dev`, which resolves Vite+
        from the global CLI, assets/node_modules/.bin, or npm exec
      - Build and preview commands use the Vite+ toolchain
      - Dependency installation uses the package manager selected by the lockfile
      - A global Vite+ install is optional: curl -fsSL https://vite.plus | bash
      - Install assets with: mix nb_vite.deps
      - Without global or local `vp`, commands are bootstrapped via:
        npm exec --yes --package=vite-plus@0.3.0 -- vp ...
      """
    )
  end
end
