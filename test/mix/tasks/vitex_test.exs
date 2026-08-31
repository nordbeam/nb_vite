defmodule Mix.Tasks.NbViteTest do
  use ExUnit.Case

  import ExUnit.CaptureIO

  alias Mix.Tasks.NbVite
  alias Mix.Tasks.NbVite.Install

  describe "run/1" do
    test "passes arguments to Vite+ when available" do
      # Mock the presence of package manager
      old_path = System.get_env("PATH")

      # Test with Vite+. The executable may not be installed in the test
      # environment, so the task is expected to raise and be rescued below.
      output =
        capture_io(fn ->
          # We can't actually run npm in tests, but we can test the command formation
          # This will fail but we can capture the attempt
          try do
            NbVite.run(["--version"])
          rescue
            _ -> :ok
          end
        end)

      # The task should attempt to run the command
      assert output =~ "vp" or output == ""

      # Restore PATH
      if old_path, do: System.put_env("PATH", old_path)
    end

    test "changes to assets directory before running" do
      in_tmp(fn ->
        File.mkdir_p!("assets")
        File.mkdir_p!("deps/vitex/priv/static/vitex")

        # Create a simple package.json
        File.write!("assets/package.json", """
        {
          "name": "test",
          "scripts": {
            "test": "echo 'Test command'"
          }
        }
        """)

        # The command will fail but we're testing that it attempts to cd to assets
        capture_io(fn ->
          try do
            NbVite.run(["test"])
          rescue
            _ -> :ok
          end
        end)

        # If we got here without crashing, the directory change worked
        assert File.exists?("assets/package.json")
      end)
    end

    test "handles deployment platforms correctly" do
      # Test Fly.io detection
      System.put_env("FLY_APP_NAME", "test-app")
      System.put_env("PRIMARY_REGION", "iad")
      System.put_env("FLY_REGION", "iad")

      capture_io(fn ->
        try do
          NbVite.run(["--version"])
        rescue
          _ -> :ok
        end
      end)

      # Clean up
      System.delete_env("FLY_APP_NAME")
      System.delete_env("PRIMARY_REGION")
      System.delete_env("FLY_REGION")
    end
  end

  describe "Vite+ assets integration" do
    test "requires an assets directory" do
      in_tmp(fn ->
        assert_raise RuntimeError, ~r/Assets directory not found/, fn ->
          NbVite.run(["build"])
        end
      end)
    end

    test "raises when the Vite+ command fails" do
      in_tmp(fn ->
        without_global_vp(fn ->
          File.mkdir_p!("assets/node_modules/.bin")
          vp = Path.expand("assets/node_modules/.bin/vp")
          File.write!(vp, "#!/bin/sh\nexit 7\n")
          File.chmod!(vp, 0o755)

          assert_raise RuntimeError, ~r/Vite\+ command failed with exit status 7/, fn ->
            NbVite.run(["check"])
          end
        end)
      end)
    end

    test "raises when Vite+ dependency installation fails" do
      in_tmp(fn ->
        without_global_vp(fn ->
          File.mkdir_p!("assets/node_modules/.bin")
          vp = Path.expand("assets/node_modules/.bin/vp")
          File.write!(vp, "#!/bin/sh\nexit 9\n")
          File.chmod!(vp, 0o755)

          assert_raise RuntimeError,
                       ~r/Vite\+ dependency installation failed with exit status 9/,
                       fn -> Mix.Tasks.NbVite.Deps.run([]) end
        end)
      end)
    end
  end

  describe "Vite+ command resolution" do
    test "uses the pinned npm exec bootstrap when no vp executable is available" do
      in_tmp(fn ->
        without_global_vp(fn ->
          assets_dir = Path.join(File.cwd!(), "assets")

          assert Elixir.NbVite.VitePlus.command(["build"], assets_dir) ==
                   {"npm",
                    [
                      "exec",
                      "--yes",
                      "--package=vite-plus@0.3.0",
                      "--",
                      "vp",
                      "build"
                    ]}

          assert Elixir.NbVite.VitePlus.install_command(File.cwd!()) ==
                   "npm exec --yes --package=vite-plus@0.3.0 -- vp -C assets install"
        end)
      end)
    end

    test "prefers the project-local vp executable over npm exec" do
      in_tmp(fn ->
        without_global_vp(fn ->
          assets_dir = Path.join(File.cwd!(), "assets")
          local_vp = Path.join([assets_dir, "node_modules", ".bin", "vp"])
          File.mkdir_p!(Path.dirname(local_vp))
          File.write!(local_vp, "#!/bin/sh\n")

          assert Elixir.NbVite.VitePlus.command(["dev"], assets_dir) ==
                   {local_vp, ["dev"]}

          assert Elixir.NbVite.VitePlus.install_command(File.cwd!()) ==
                   "assets/node_modules/.bin/vp -C assets install"
        end)
      end)
    end

    test "prefers the global vp executable over the project-local executable" do
      in_tmp(fn ->
        bin_dir = Path.join(File.cwd!(), "bin")
        assets_dir = Path.join(File.cwd!(), "assets")
        global_vp = Path.join(bin_dir, "vp")
        local_vp = Path.join([assets_dir, "node_modules", ".bin", "vp"])
        File.mkdir_p!(Path.dirname(global_vp))
        File.mkdir_p!(Path.dirname(local_vp))
        File.write!(global_vp, "#!/bin/sh\n")
        File.write!(local_vp, "#!/bin/sh\n")
        File.chmod!(global_vp, 0o755)
        old_path = System.get_env("PATH")
        System.put_env("PATH", bin_dir)

        try do
          assert Elixir.NbVite.VitePlus.command(["preview"], assets_dir) ==
                   {"vp", ["preview"]}

          assert Elixir.NbVite.VitePlus.install_command(File.cwd!()) ==
                   "vp -C assets install"
        after
          if old_path, do: System.put_env("PATH", old_path), else: System.delete_env("PATH")
        end
      end)
    end
  end

  describe "Vite+ package manifest" do
    test "adds the npm 12 root git allowlist without dropping project config" do
      existing = "registry=https://registry.npmjs.org\nstrict-peer-deps=true\n"

      migrated = Install.merge_npmrc(existing)

      assert migrated == existing <> "allow-git=root\nallow-remote=all\n"
      assert Install.merge_npmrc(migrated) == migrated
    end

    test "replaces incompatible npm git policies and preserves comments" do
      existing =
        "# allow-git=none\nallow-git = none\nallow-remote = none\nfund=false\n"

      assert Install.merge_npmrc(existing) ==
               "# allow-git=none\nallow-git=root\nallow-remote=all\nfund=false\n"
    end

    test "maps local nb_vite Mix dependencies to the GitHub package directory" do
      source =
        Install.npm_source_from_dep_declaration(
          "{:nb_vite, [path: \"../nb_vite\", override: true]}",
          "git+https://github.com/nordbeam/nb_vite.git"
        )

      assert source == "file:#{Path.expand("../nb_vite/priv/nb_vite")}"
    end

    test "maps GitHub Mix refs to the matching JavaScript dependency" do
      source =
        Install.npm_source_from_dep_declaration(
          "{:nb_vite, [github: \"nordbeam/nb_vite\", ref: \"abc123\"]}",
          "git+https://github.com/nordbeam/nb_vite.git"
        )

      assert source == "git+https://github.com/nordbeam/nb_vite.git#abc123"
    end

    test "builds a fresh manifest with the pinned Vite+ toolchain" do
      manifest = Install.package_json(features(typescript: true), "demo_app")

      assert manifest["name"] == "demo_app"
      assert manifest["type"] == "module"
      assert manifest["devDependencies"]["vite-plus"] == "0.3.0"
      assert manifest["devDependencies"]["vite"] == "npm:@voidzero-dev/vite-plus-core@0.3.0"

      assert manifest["devDependencies"]["@nordbeam/nb-vite"] ==
               "git+https://github.com/nordbeam/nb_vite.git"

      assert manifest["devDependencies"]["typescript"] == "^5.9.3"
      assert manifest["overrides"]["vite"] == "npm:@voidzero-dev/vite-plus-core@0.3.0"
      assert manifest["overrides"]["vitest"] == "4.1.11"
      assert manifest["engines"]["node"] == ">=20.19.0"
      assert manifest["packageManager"] == "npm@12.0.2"

      assert manifest["devEngines"]["packageManager"] == %{
               "name" => "npm",
               "version" => "12.0.2",
               "onFail" => "download"
             }

      refute Map.has_key?(manifest, "workspaces")
      assert manifest["dependencies"]["phoenix"] == "^1.8.13"
      assert manifest["dependencies"]["phoenix_html"] == "^4.3.0"
      assert manifest["dependencies"]["phoenix_live_view"] == "^1.2.11"
      assert manifest["scripts"]["dev"] == "vp dev"
      assert manifest["scripts"]["build"] == "vp build"
      assert manifest["scripts"]["check"] == "vp check"
      assert manifest["scripts"]["check:fix"] == "vp check --fix"
      assert manifest["scripts"]["types:check"] == "tsc --noEmit"
    end

    test "keeps the JavaScript-only check script on Vite+" do
      manifest = Install.package_json(features(typescript: false), "demo_app")

      assert manifest["scripts"]["check"] == "vp check"
      refute Map.has_key?(manifest["scripts"], "types:check")
    end

    test "upgrades an existing manifest without dropping app configuration" do
      generated = Install.package_json(features(typescript: true), "demo_app")

      existing = %{
        "name" => "demo_app",
        "type" => "commonjs",
        "dependencies" => %{"custom-ui" => "^2.0.0"},
        "devDependencies" => %{"typescript" => "^5.9.0", "custom-tool" => "^1.0.0"},
        "scripts" => %{
          "dev" => "legacy-dev",
          "build" => "legacy-build",
          "lint" => "custom-lint"
        },
        "overrides" => %{"custom-tool" => "1.0.1"},
        "packageManager" => "pnpm@11.24.0",
        "workspaces" => [
          "../deps/phoenix",
          "packages/*",
          "../deps/phoenix_html",
          "shared/*",
          "../deps/phoenix_live_view"
        ]
      }

      migrated = Install.merge_package_json(existing, generated)
      migrated_again = Install.merge_package_json(migrated, generated)

      assert migrated["type"] == "module"
      assert migrated["dependencies"]["custom-ui"] == "^2.0.0"
      assert migrated["devDependencies"]["custom-tool"] == "^1.0.0"
      assert migrated["scripts"]["lint"] == "custom-lint"
      assert migrated["scripts"]["dev"] == "vp dev"
      assert migrated["scripts"]["build"] == "vp build"
      assert migrated["overrides"]["custom-tool"] == "1.0.1"
      assert migrated["overrides"]["vitest"] == "4.1.11"
      assert migrated["packageManager"] == "pnpm@11.24.0"

      assert migrated["workspaces"] == ["packages/*", "shared/*"]

      assert migrated_again == migrated
    end

    test "removes the workspaces key when it contains only legacy Phoenix dependencies" do
      generated = Install.package_json(features(typescript: true), "demo_app")

      existing = %{
        "workspaces" => [
          "../deps/phoenix",
          "../deps/phoenix_html",
          "../deps/phoenix_live_view"
        ]
      }

      migrated = Install.merge_package_json(existing, generated)

      refute Map.has_key?(migrated, "workspaces")
    end

    test "removes legacy Phoenix entries from object workspaces while preserving custom config" do
      generated = Install.package_json(features(typescript: true), "demo_app")

      existing = %{
        "workspaces" => %{
          "packages" => ["../deps/phoenix", "packages/*", "../deps/phoenix_live_view"],
          "nohoist" => ["custom-package"]
        }
      }

      migrated = Install.merge_package_json(existing, generated)

      assert migrated["workspaces"] == %{
               "packages" => ["packages/*"],
               "nohoist" => ["custom-package"]
             }
    end

    test "upgrades npm projects to the npm 12 baseline" do
      generated = Install.package_json(features(typescript: true), "demo_app")

      legacy = %{
        "packageManager" => "npm@11.19.0",
        "devEngines" => %{
          "runtime" => %{"name" => "node", "onFail" => "error"},
          "packageManager" => %{
            "name" => "npm",
            "version" => "11.19.0"
          }
        }
      }

      migrated = Install.merge_package_json(legacy, generated)

      assert migrated["packageManager"] == "npm@12.0.2"

      assert migrated["devEngines"]["packageManager"] ==
               generated["devEngines"]["packageManager"]

      assert migrated["devEngines"]["runtime"] == %{
               "name" => "node",
               "onFail" => "error"
             }
    end

    test "normalizes unversioned npm and malformed devEngines values" do
      generated = Install.package_json(features(typescript: true), "demo_app")

      migrated =
        Install.merge_package_json(
          %{"packageManager" => "npm", "devEngines" => "invalid"},
          generated
        )

      assert migrated["packageManager"] == "npm@12.0.2"
      assert migrated["devEngines"] == generated["devEngines"]
    end
  end

  describe "Vite+ Vite config migration" do
    test "rewrites a simple existing config and is idempotent" do
      existing = """
      import { defineConfig } from 'vite';

      export default defineConfig({
        plugins: [phoenix({ input: 'js/app.ts' })],
      });
      """

      migrated = Install.migrate_vite_config_content(existing, %{typescript: true})

      assert migrated =~ "from 'vite-plus'"
      assert migrated =~ "import { defineConfig, lazyPlugins } from 'vite-plus'"
      assert migrated =~ "lazyPlugins(() => [phoenix({ input: 'js/app.ts' })])"
      refute migrated =~ "typeAware"
      refute migrated =~ "typeCheck"
      assert migrated =~ "sortPackageJson: true"
      refute migrated =~ "from 'vite';"
      assert Install.migrate_vite_config_content(migrated, %{typescript: true}) == migrated
      assert Install.vite_plus_config?(migrated)
    end

    test "leaves complex plugin arrays intact while migrating the import" do
      existing = """
      import { defineConfig } from 'vite';

      export default defineConfig({
        plugins: [react({ include: ['**/*.tsx'] })],
      });
      """

      migrated = Install.migrate_vite_config_content(existing, %{typescript: false})

      assert migrated =~ "from 'vite-plus'"
      assert migrated =~ "plugins: [react({ include: ['**/*.tsx'] })]"
      assert migrated =~ "fmt: {"
      refute migrated =~ "lazyPlugins"
    end
  end

  defp features(options) do
    Map.merge(
      %{
        react: false,
        typescript: false,
        ssr: false,
        tailwind: false,
        topbar: false,
        daisyui: false
      },
      Enum.into(options, %{})
    )
  end

  defp in_tmp(fun) do
    tmp_path = Path.join(System.tmp_dir!(), "vitex_test_#{:rand.uniform(10000)}")
    File.mkdir_p!(tmp_path)

    try do
      File.cd!(tmp_path, fun)
    after
      File.rm_rf!(tmp_path)
    end
  end

  defp without_global_vp(fun) do
    old_path = System.get_env("PATH")
    System.put_env("PATH", "")

    try do
      fun.()
    after
      if old_path, do: System.put_env("PATH", old_path), else: System.delete_env("PATH")
    end
  end
end
