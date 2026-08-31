defmodule NbVite.VitePlus do
  @moduledoc false

  @vite_plus_version "0.3.0"
  @vite_plus_package "vite-plus@#{@vite_plus_version}"

  @doc false
  def version, do: @vite_plus_version

  @doc false
  def command(args, assets_dir) when is_list(args) and is_binary(assets_dir) do
    case resolve(assets_dir) do
      :global ->
        {"vp", args}

      {:local, executable} ->
        {executable, args}

      :npm_exec ->
        {"npm", ["exec", "--yes", "--package=#{@vite_plus_package}", "--", "vp" | args]}
    end
  end

  @doc false
  def resolve(assets_dir) when is_binary(assets_dir) do
    cond do
      System.find_executable("vp") ->
        :global

      local_executable = local_executable(assets_dir) ->
        {:local, local_executable}

      true ->
        :npm_exec
    end
  end

  @doc false
  def local_executable(assets_dir) when is_binary(assets_dir) do
    executable = Path.join([assets_dir, "node_modules", ".bin", "vp"])

    cond do
      File.exists?(executable) -> executable
      File.exists?(executable <> ".cmd") -> executable <> ".cmd"
      true -> nil
    end
  end

  @doc false
  def install_command(project_dir \\ File.cwd!()) when is_binary(project_dir) do
    assets_dir = Path.join(project_dir, "assets")

    case dependency_command(assets_dir) do
      {"npm", ["install"]} -> "npm --prefix assets install"
      {command, args} -> Enum.join([command | args], " ") |> then(&"cd assets && #{&1}")
    end
  end

  @doc false
  def dependency_command(assets_dir) when is_binary(assets_dir) do
    cond do
      File.exists?(Path.join(assets_dir, "pnpm-lock.yaml")) -> {"pnpm", ["install"]}
      File.exists?(Path.join(assets_dir, "yarn.lock")) -> {"yarn", ["install"]}
      File.exists?(Path.join(assets_dir, "bun.lock")) -> {"bun", ["install"]}
      File.exists?(Path.join(assets_dir, "bun.lockb")) -> {"bun", ["install"]}
      true -> {"npm", ["install"]}
    end
  end
end
