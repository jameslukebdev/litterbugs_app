import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('.', import.meta.url)) },
    ],
  },
});
