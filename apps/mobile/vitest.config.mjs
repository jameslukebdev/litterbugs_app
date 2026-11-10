import { fileURLToPath } from 'node:url';
import { transformWithOxc } from 'vite';
import { configDefaults, defineConfig } from 'vitest/config';

const mobileDirectory = fileURLToPath(new URL('.', import.meta.url));

// Metro turns `require('./x.png')` into an image asset. Tests run in Node, which
// would try to parse the PNG as JavaScript, so stand in a placeholder source.
const IMAGE_REQUIRE = /require\((['"])([^'"]+\.(?:png|jpe?g|gif|webp))\1\)/g;

export default defineConfig({
  plugins: [{
    name: 'mobile-image-requires',
    enforce: 'pre',
    transform(code, id) {
      if (!id.startsWith(mobileDirectory) || id.includes('/node_modules/') || !/\.jsx?$/.test(id)) return;
      if (!IMAGE_REQUIRE.test(code)) return;
      IMAGE_REQUIRE.lastIndex = 0;
      return code.replace(IMAGE_REQUIRE, (_match, _quote, path) => JSON.stringify({ testUri: path }));
    },
  }, {
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
