import { fileURLToPath } from 'node:url';
import { transformWithOxc } from 'vite';
import { configDefaults, defineConfig } from 'vitest/config';

const mobileDirectory = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [{
    name: 'mobile-jsx-in-js',
    enforce: 'pre',
    transform(code, id) {
      if (id.startsWith(mobileDirectory) && id.endsWith('.js') && !id.includes('/node_modules/')) {
        return transformWithOxc(code, id, { lang: 'jsx', jsx: { runtime: 'automatic' } });
      }
    },
  }],
  test: {
    maxWorkers: 2,
    exclude: [...configDefaults.exclude, 'ios/**', 'android/**', 'dist/**'],
  },
});
