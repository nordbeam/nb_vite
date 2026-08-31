import * as path from "path";
import { spawn } from "child_process";
//#region src/vite-plugin-nb-routes.ts
/**
* Creates a Vite plugin for nb_routes auto-regeneration
*
* @example
* ```typescript
* import { defineConfig, lazyPlugins } from 'vite-plus';
* import { nbRoutes } from '@nordbeam/nb-vite/nb-routes';
*
* export default defineConfig({
*   plugins: lazyPlugins(() => [
*     nbRoutes({
*       enabled: true,
*       verbose: true
*     })
*   ])
* });
* ```
*/
function nbRoutes(options = {}) {
	const opts = {
		enabled: true,
		routerPath: ["lib/**/*_web/router.ex", "lib/**/router.ex"],
		debounce: 300,
		verbose: false,
		routesFile: "assets/js/routes.js",
		command: "mix nb_routes.gen",
		...options
	};
	let server = null;
	let isRegenerating = false;
	let debounceTimer = null;
	/**
	* Trigger route regeneration
	*/
	function regenerateRoutes() {
		if (isRegenerating) {
			if (opts.verbose) console.log("[nb-vite:routes] Regeneration already in progress, skipping...");
			return;
		}
		isRegenerating = true;
		if (opts.verbose) console.log("[nb-vite:routes] Regenerating routes...");
		const [cmd, ...args] = opts.command.split(" ");
		const spawnOptions = {
			stdio: "inherit",
			cwd: opts.cwd || process.cwd(),
			shell: process.platform === "win32"
		};
		const child = spawn(cmd, args, spawnOptions);
		child.on("close", (code) => {
			isRegenerating = false;
			if (code === 0) {
				if (opts.verbose) console.log("[nb-vite:routes] Routes regenerated successfully");
				if (server) invalidateRoutesModule(server, opts.routesFile);
			} else console.error("[nb-vite:routes] Route generation failed with code", code);
		});
		child.on("error", (err) => {
			isRegenerating = false;
			console.error("[nb-vite:routes] Error executing route generation:", err);
		});
	}
	/**
	* Debounced route regeneration
	*/
	function debouncedRegenerate() {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			regenerateRoutes();
			debounceTimer = null;
		}, opts.debounce);
	}
	/**
	* Invalidate the routes module in Vite's module graph
	*/
	function invalidateRoutesModule(server, routesFile) {
		const possiblePaths = [
			`/${routesFile}`,
			`/${routesFile.replace(/^assets\//, "")}`,
			path.resolve(routesFile),
			path.resolve("assets", path.basename(routesFile))
		];
		for (const modulePath of possiblePaths) {
			const module = server.moduleGraph.getModuleById(modulePath);
			if (module) {
				if (opts.verbose) console.log(`[nb-vite:routes] Invalidating module: ${modulePath}`);
				server.moduleGraph.invalidateModule(module);
				server.ws.send({
					type: "full-reload",
					path: "*"
				});
				return;
			}
		}
		if (opts.verbose) console.log(`[nb-vite:routes] Module not found in graph, triggering full reload`);
		server.ws.send({
			type: "full-reload",
			path: "*"
		});
	}
	/**
	* Check if a file matches the router pattern
	*/
	function matchesRouterPattern(filePath) {
		return (Array.isArray(opts.routerPath) ? opts.routerPath : [opts.routerPath]).some((pattern) => {
			const regex = pattern.replace(/\./g, "\\.").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*");
			return new RegExp(`^${regex}$`).test(filePath);
		});
	}
	return {
		name: "nb-routes",
		configureServer(devServer) {
			if (!opts.enabled) return;
			server = devServer;
			if (opts.verbose) {
				console.log("[nb-vite:routes] Plugin enabled");
				console.log(`[nb-vite:routes] Watching patterns:`, opts.routerPath);
			}
			devServer.watcher.on("change", (filePath) => {
				const relativePath = path.relative(process.cwd(), filePath);
				if (matchesRouterPattern(relativePath)) {
					if (opts.verbose) console.log(`[nb-vite:routes] Detected change: ${relativePath}`);
					debouncedRegenerate();
				}
			});
			devServer.httpServer?.once("close", () => {
				if (debounceTimer) clearTimeout(debounceTimer);
			});
		},
		buildStart() {
			if (!opts.enabled) return;
			if (opts.verbose) console.log("[nb-vite:routes] Generating routes for build...");
			regenerateRoutes();
		}
	};
}
//#endregion
export { nbRoutes as default, nbRoutes };
