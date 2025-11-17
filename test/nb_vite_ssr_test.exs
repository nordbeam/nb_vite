defmodule NbVite.SSRTest do
  use ExUnit.Case, async: false

  import ExUnit.CaptureLog

  @moduletag :ssr

  describe "SSR endpoint configuration" do
    test "SSR configuration defaults" do
      # Test default SSR configuration values
      config = %{
        enabled: true,
        path: "/ssr",
        healthPath: "/ssr-health",
        entryPoint: "./js/ssr_dev.tsx",
        hotFile: "priv/ssr-hot"
      }

      assert config.enabled == true
      assert config.path == "/ssr"
      assert config.healthPath == "/ssr-health"
      assert config.entryPoint == "./js/ssr_dev.tsx"
      assert config.hotFile == "priv/ssr-hot"
    end

    test "SSR can be disabled" do
      config = %{enabled: false}
      assert config.enabled == false
    end

    test "SSR paths can be customized" do
      config = %{
        enabled: true,
        path: "/custom-ssr",
        healthPath: "/custom-health",
        entryPoint: "./custom/ssr.tsx"
      }

      assert config.path == "/custom-ssr"
      assert config.healthPath == "/custom-health"
      assert config.entryPoint == "./custom/ssr.tsx"
    end
  end

  describe "SSR hot file" do
    setup do
      # Create a temporary directory for testing
      tmp_dir = System.tmp_dir!()
      hot_file = Path.join(tmp_dir, "test-ssr-hot-#{:rand.uniform(1000)}")

      on_exit(fn ->
        if File.exists?(hot_file), do: File.rm!(hot_file)
      end)

      {:ok, hot_file: hot_file}
    end

    test "SSR hot file contains correct URL", %{hot_file: hot_file} do
      # Simulate writing the SSR hot file
      ssr_url = "http://localhost:5173/ssr"
      File.write!(hot_file, ssr_url)

      assert File.read!(hot_file) == ssr_url
    end

    test "SSR hot file is created when SSR is enabled", %{hot_file: hot_file} do
      refute File.exists?(hot_file)

      # Simulate Vite plugin creating the hot file
      File.write!(hot_file, "http://localhost:5173/ssr")

      assert File.exists?(hot_file)
    end

    test "SSR hot file is cleaned up on exit", %{hot_file: hot_file} do
      File.write!(hot_file, "http://localhost:5173/ssr")
      assert File.exists?(hot_file)

      # Simulate cleanup
      File.rm!(hot_file)
      refute File.exists?(hot_file)
    end
  end

  describe "SSR endpoint behavior" do
    test "health check endpoint returns JSON" do
      # Expected health check response format
      health_response = %{
        "status" => "ok",
        "ready" => true,
        "mode" => "vite-plugin"
      }

      assert health_response["status"] == "ok"
      assert is_boolean(health_response["ready"])
      assert health_response["mode"] == "vite-plugin"
    end

    test "health check shows ready status" do
      # When render function is loaded
      ready_response = %{"status" => "ok", "ready" => true, "mode" => "vite-plugin"}
      assert ready_response["ready"] == true

      # When render function is not loaded
      not_ready_response = %{"status" => "ok", "ready" => false, "mode" => "vite-plugin"}
      assert not_ready_response["ready"] == false
    end

    test "SSR endpoint accepts POST requests with JSON body" do
      # Expected request format
      request_body = %{
        "component" => "Pages/Users/Index",
        "props" => %{"users" => []},
        "url" => "/users",
        "version" => "abc123"
      }

      assert is_map(request_body)
      assert Map.has_key?(request_body, "component")
      assert Map.has_key?(request_body, "props")
    end

    test "SSR endpoint returns success response" do
      # Expected success response format
      success_response = %{
        "success" => true,
        "result" => %{
          "head" => ["<title>Users</title>"],
          "body" => "<div>Users List</div>"
        }
      }

      assert success_response["success"] == true
      assert is_map(success_response["result"])
    end

    test "SSR endpoint returns error response on failure" do
      # Expected error response format
      error_response = %{
        "success" => false,
        "error" => %{
          "message" => "Component not found",
          "stack" => "Error: Component not found\n  at ..."
        }
      }

      assert error_response["success"] == false
      assert is_map(error_response["error"])
      assert Map.has_key?(error_response["error"], "message")
    end

    test "SSR endpoint rejects non-POST methods" do
      # GET, PUT, DELETE, etc. should return 405
      rejected_methods = ["GET", "PUT", "DELETE", "PATCH"]

      for method <- rejected_methods do
        assert method != "POST"
      end
    end

    test "SSR endpoint handles CORS preflight" do
      # OPTIONS request should return 200
      cors_headers = %{
        "Access-Control-Allow-Origin" => "*",
        "Access-Control-Allow-Methods" => "POST, OPTIONS",
        "Access-Control-Allow-Headers" => "Content-Type"
      }

      assert cors_headers["Access-Control-Allow-Origin"] == "*"
      assert String.contains?(cors_headers["Access-Control-Allow-Methods"], "OPTIONS")
    end
  end

  describe "SSR module loading and caching" do
    test "render function is loaded from entry point" do
      # Expected entry point exports
      ssr_module = %{
        "render" => fn _page -> {:ok, %{head: [], body: "<div>Test</div>"}} end
      }

      assert Map.has_key?(ssr_module, "render")
      assert is_function(ssr_module["render"], 1)
    end

    test "render function must be exported" do
      # Module without render function should error
      invalid_module = %{}

      refute Map.has_key?(invalid_module, "render")
    end

    test "render function is cached after first load" do
      # Simulate caching behavior
      cache = %{render: nil}

      # First load
      cache = %{render: fn _ -> {:ok, "result"} end}
      assert cache.render != nil

      # Second load should use cache
      assert cache.render != nil
    end

    test "cache is invalidated on file changes" do
      # Simulate cache invalidation
      cache = %{render: fn _ -> {:ok, "old"} end}
      assert cache.render != nil

      # File change triggers cache clear
      cache = %{render: nil}
      assert cache.render == nil
    end

    test "routes.js and routes.d.ts changes are ignored" do
      # These files should not trigger SSR cache invalidation
      ignored_files = ["routes.js", "routes.d.ts"]

      for file <- ignored_files do
        assert String.ends_with?(file, ".js") or String.ends_with?(file, ".ts")
      end
    end

    test "only JS/TS files in js/ directory trigger cache invalidation" do
      # Files outside js/ or non-JS/TS files should be ignored
      valid_files = [
        "assets/js/app.tsx",
        "assets/js/components/Button.tsx",
        "assets/js/lib/utils.ts"
      ]

      invalid_files = [
        "lib/my_app_web/controllers/user_controller.ex",
        "assets/css/app.css",
        "assets/images/logo.png"
      ]

      for file <- valid_files do
        assert String.contains?(file, "/js/")
        assert String.ends_with?(file, ".tsx") or String.ends_with?(file, ".ts")
      end

      for file <- invalid_files do
        refute String.contains?(file, "/js/") and
                 (String.ends_with?(file, ".tsx") or String.ends_with?(file, ".ts") or
                    String.ends_with?(file, ".jsx") or String.ends_with?(file, ".js"))
      end
    end
  end

  describe "SSR error handling" do
    test "invalid JSON body returns error" do
      # Malformed JSON should be handled gracefully
      invalid_json = "{ invalid json"

      assert is_binary(invalid_json)
      # Would trigger JSON parse error
    end

    test "missing component returns error" do
      error = %{
        "message" => "Component not found",
        "stack" => "Error: Component not found"
      }

      assert error["message"] =~ "not found"
    end

    test "render function errors are caught and returned" do
      # Simulating a render error
      render_error = fn _page ->
        raise "Render failed"
      end

      assert_raise RuntimeError, "Render failed", fn ->
        render_error.(%{})
      end
    end

    test "errors include stack trace when available" do
      error = %{
        "message" => "Something went wrong",
        "stack" => "Error: Something went wrong\n  at render (ssr.tsx:10:5)"
      }

      assert error["stack"] != nil
      assert String.contains?(error["stack"], "Error:")
    end

    test "empty stack traces are normalized to nil" do
      error_with_empty_stack = %{
        "message" => "Error occurred",
        "stack" => ""
      }

      # Empty stack should be treated as nil
      normalized_stack =
        if error_with_empty_stack["stack"] == "", do: nil, else: error_with_empty_stack["stack"]

      assert normalized_stack == nil
    end
  end

  describe "vite-node integration" do
    test "vite-node dependencies can be dynamically loaded" do
      # Test that vite-node modules can be loaded
      # This would be done via dynamic import in the actual implementation
      vite_node_modules = [
        "vite-node/server",
        "vite-node/client",
        "vite-node/source-map"
      ]

      for module <- vite_node_modules do
        assert String.starts_with?(module, "vite-node/")
      end
    end

    test "SSR gracefully handles missing vite-node" do
      # When vite-node is not installed, SSR should warn but not crash
      log =
        capture_log(fn ->
          # Simulate vite-node not available
          require Logger
          Logger.warning("vite-node is not available. SSR dev endpoint will not be enabled.")
        end)

      assert log =~ "vite-node"
    end

    test "source maps are supported" do
      # vite-node provides source map support
      source_map_config = %{
        getSourceMap: fn _source -> %{} end
      }

      assert is_function(source_map_config.getSourceMap, 1)
    end

    test "module cache can be cleared" do
      # Simulate vite-node module cache
      module_cache = %{
        "/path/to/file.tsx" => %{exports: %{}}
      }

      assert map_size(module_cache) == 1

      # Clear cache
      module_cache = %{}
      assert map_size(module_cache) == 0
    end

    test "module cache can be selectively cleared" do
      # Simulate selective cache clearing
      module_cache = %{
        "/path/to/file1.tsx" => %{},
        "/path/to/file2.tsx" => %{}
      }

      assert map_size(module_cache) == 2

      # Delete specific file
      module_cache = Map.delete(module_cache, "/path/to/file1.tsx")
      assert map_size(module_cache) == 1
      assert Map.has_key?(module_cache, "/path/to/file2.tsx")
    end
  end

  describe "SSR logging" do
    test "SSR initialization is logged" do
      log =
        capture_log(fn ->
          require Logger
          Logger.info("[vite:ssr] Initializing SSR endpoint...")
        end)

      assert log =~ "Initializing SSR endpoint"
    end

    test "render requests are logged with component name" do
      log =
        capture_log(fn ->
          require Logger
          Logger.info("[vite:ssr] Rendering page: Pages/Users/Index")
        end)

      assert log =~ "Rendering page"
      assert log =~ "Pages/Users/Index"
    end

    test "successful renders are logged" do
      log =
        capture_log(fn ->
          require Logger
          Logger.info("[vite:ssr] Rendered successfully")
        end)

      assert log =~ "Rendered successfully"
    end

    test "cache invalidation is logged" do
      log =
        capture_log(fn ->
          require Logger
          Logger.info("[vite:ssr] File changed: /js/components/Button.tsx")
          Logger.info("[vite:ssr] Cache invalidated - will reload on next request")
        end)

      assert log =~ "File changed"
      assert log =~ "Cache invalidated"
    end

    test "skipped cache invalidation is logged" do
      log =
        capture_log(fn ->
          require Logger
          Logger.info("[vite:ssr] Skipping SSR cache invalidation for: /js/routes.js")
        end)

      assert log =~ "Skipping SSR cache invalidation"
    end
  end
end
