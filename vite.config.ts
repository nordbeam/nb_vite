import { defineConfig } from 'vite-plus';

/**
 * Repository-level Vite+ checks for the Elixir package and its TypeScript
 * plugin source. The nested config in `priv/nb_vite/` owns `vp pack`.
 */
export default defineConfig({
  lint: {
    ignorePatterns: [
      '**/*.ex',
      '**/*.exs',
      '**/*.heex',
      '**/*.md',
      '**/*.yml',
      '**/*.yaml',
      'deps/**',
      'doc/**',
      '_build/**',
      'priv/nb_vite/dist/**',
      'priv/static/**',
    ],
  },
  fmt: {
    ignorePatterns: [
      '**/*.ex',
      '**/*.exs',
      '**/*.heex',
      '**/*.md',
      '**/*.yml',
      '**/*.yaml',
      'deps/**',
      'doc/**',
      '_build/**',
      'priv/nb_vite/dist/**',
      'priv/static/**',
    ],
    singleQuote: true,
    semi: true,
    sortPackageJson: true,
  },
});
