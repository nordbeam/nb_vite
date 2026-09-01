import { describe, expect, it, vi } from 'vitest';
import type { ConfigEnv, Plugin, UserConfig, ViteDevServer } from 'vite';
import phoenix from './index';

function corePlugin(): Plugin {
  const plugin = phoenix({
    input: 'priv/nb_vite/src/index.ts',
    ssr: 'priv/nb_vite/src/index.ts',
    ssrDev: true,
  })[0];

  return plugin as Plugin;
}

describe('Phoenix plugin in Vitest', () => {
  it('does not run Phoenix development checks while resolving test config', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    try {
      const plugin = corePlugin();
      const configHook = plugin.config as (config: UserConfig, env: ConfigEnv) => UserConfig;

      configHook({}, { command: 'serve', mode: 'test' });

      expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('PHX_HOST'));
      expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('Hot file directory'));
    } finally {
      warn.mockRestore();
    }
  });

  it('does not start SSR, middleware, watchers, or process handlers for a test server', async () => {
    const plugin = corePlugin();
    const watcher = { on: vi.fn() };
    const middlewares = { use: vi.fn() };
    const server = {
      config: { mode: 'test' },
      watcher,
      middlewares,
    } as unknown as ViteDevServer;

    const configureServer = plugin.configureServer as (
      server: ViteDevServer,
    ) => void | Promise<void>;

    await configureServer(server);

    expect(watcher.on).not.toHaveBeenCalled();
    expect(middlewares.use).not.toHaveBeenCalled();
  });
});
