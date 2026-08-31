defmodule NbVite.VitePlus do
  @moduledoc false

  @vite_plus_version "0.3.0"
  @vite_plus_package "vite-plus@#{@vite_plus_version}"
  @npm_version "12.0.2"
  @npm_package "npm@#{@npm_version}"

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
        {"corepack",
         [
           @npm_package,
           "exec",
           "--yes",
           "--package=#{@vite_plus_package}",
           "--",
           "vp" | args
         ]}
    end
  end

  @doc false
  def execute({executable, args}, options \\ [])
      when is_binary(executable) and is_list(args) and is_list(options) do
    options =
      options
      |> Keyword.put_new(:stderr_to_stdout, true)
      |> Keyword.put_new(:into, %Mix.Shell{callback: &IO.write/1})

    {_, status} = System.cmd(executable, args, options)
    status
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

    case resolve(assets_dir) do
      :global ->
        "vp -C assets install"

      {:local, executable} ->
        "#{Path.relative_to(executable, project_dir)} -C assets install"

      :npm_exec ->
        "corepack #{@npm_package} exec --yes --package=#{@vite_plus_package} -- vp -C assets install"
    end
  end
end
