defmodule Mix.Tasks.NbVite do
  @moduledoc """
  Invokes Vite with the given args.

  Usage:

      $ mix nb_vite COMMAND ARGS

  Examples:

      $ mix nb_vite build
      $ mix nb_vite dev
      $ mix nb_vite preview

  """
  @shortdoc "Invokes Vite with the given args"

  use Mix.Task

  @impl true
  def run(args) do
    # Use the bun binary from the bun Mix package
    bun_path = Path.join(Mix.Project.build_path(), "bun")

    unless File.exists?(bun_path) do
      raise """
      Bun binary not found at #{bun_path}
      Please run: mix bun.install
      """
    end

    # Get assets directory path
    assets_dir = Path.join(File.cwd!(), "assets")

    unless File.exists?(assets_dir) do
      raise "Assets directory not found at #{assets_dir}"
    end

    cmd_args = ["x", "--bun", "vite"] ++ args

    # Pass through important environment variables
    env = [
      {"NODE_ENV", node_env()},
      {"MIX_ENV", to_string(Mix.env())},
      {"PHOENIX_BUILD_PATH", Mix.Project.build_path()},
      {"PHX_BUILD_PATH", Mix.Project.build_path()},
      {"PHX_APP_NAME", to_string(Mix.Project.config()[:app])},
      {"PHX_VERSION", phoenix_version()}
    ]

    # Pass through Phoenix-specific env vars if they exist
    env =
      env
      |> maybe_add_env("PHX_HOST")
      |> maybe_add_env("VITE_DEV_SERVER_KEY")
      |> maybe_add_env("VITE_DEV_SERVER_CERT")
      |> maybe_add_env("PHOENIX_DOCKER")
      |> maybe_add_env("DOCKER_ENV")
      |> maybe_add_env("VITE_PORT")
      |> maybe_add_env("PHOENIX_BYPASS_ENV_CHECK")
      |> maybe_add_env("CI")
      |> maybe_add_env("RELEASE_NAME")
      |> maybe_add_env("FLY_APP_NAME")
      |> maybe_add_env("GIGALIXIR_APP_NAME")
      |> maybe_add_env("HEROKU_APP_NAME")
      |> maybe_add_env("RENDER")
      |> maybe_add_env("RAILWAY_ENVIRONMENT")

    Mix.shell().cmd("cd #{assets_dir} && #{bun_path} #{Enum.join(cmd_args, " ")}", env: env)
  end

  defp node_env do
    if Mix.env() == :prod, do: "production", else: "development"
  end

  defp maybe_add_env(env, key) do
    case System.get_env(key) do
      nil -> env
      value -> env ++ [{key, value}]
    end
  end

  defp phoenix_version do
    # Check if phoenix_live_view dependency exists and get version
    case List.keyfind(Mix.Project.config()[:deps] || [], :phoenix_live_view, 0) do
      {:phoenix_live_view, version_req} when is_binary(version_req) ->
        # Extract major.minor from version requirement
        case Regex.run(~r/(\d+)\.(\d+)/, version_req) do
          # Assume .8+ for Phoenix 1.8+
          [_, major, _minor] -> "#{major}.8"
          _ -> "unknown"
        end

      # Default to 1.8 if colocated JS is being used
      _ ->
        "1.8"
    end
  end
end

defmodule Mix.Tasks.NbVite.Build do
  @moduledoc """
  Builds assets via Vite.

  Usage:

      $ mix vite.build

  The task will install dependencies if needed and then run the build.
  """
  @shortdoc "Builds assets via Vite"

  use Mix.Task

  @impl true
  def run(_args) do
    Mix.Tasks.NbVite.Deps.run([])
    Mix.Tasks.NbVite.run(["build"])
  end
end

defmodule Mix.Tasks.NbVite.Deps do
  @moduledoc """
  Installs JavaScript dependencies using the Bun binary from the bun Mix package.

  Usage:

      $ mix nb_vite.deps

  This task uses the Bun binary downloaded by the bun Mix package.
  Make sure to run `mix bun.install` first if you haven't already.
  """
  @shortdoc "Installs JavaScript dependencies using Bun"

  use Mix.Task

  @impl true
  def run(_args) do
    # Use the bun binary from the bun Mix package
    bun_path = Path.join(Mix.Project.build_path(), "bun")

    unless File.exists?(bun_path) do
      raise """
      Bun binary not found at #{bun_path}
      Please run: mix bun.install
      """
    end

    assets_dir = Path.join(File.cwd!(), "assets")

    unless File.exists?(assets_dir) do
      raise "Assets directory not found at #{assets_dir}"
    end

    # Use bun with --cwd flag to install in assets directory
    cmd = "#{bun_path} --cwd #{assets_dir} install"

    Mix.shell().cmd(cmd)
  end
end
