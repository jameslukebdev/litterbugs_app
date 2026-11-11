// Minimal lint for the app: catches names that are used but never defined or
// imported, which tests don't see. Run with `npm run lint`.
const runtimeGlobals = Object.fromEntries([
  'console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'requestAnimationFrame', 'cancelAnimationFrame', 'require', 'globalThis', 'Buffer',
  'fetch', 'Promise', 'URL', 'URLSearchParams', 'AbortController', 'process', '__DEV__',
  'FormData', 'Blob', 'atob', 'btoa', 'performance', 'queueMicrotask', 'Intl',
  'crypto', 'Response',
].map((name) => [name, 'readonly']));

export default [
  { ignores: ['node_modules/**', 'ios/**', 'android/**', 'dist/**', '**/*.test.js', '**/*.test.jsx', 'test-support/**', 'native-tests/**', 'qa/**', 'plugins/**', 'firebase/**', 'credentials/**', '*.config.js', '*.config.mjs', 'vitest.setup.js'] },
  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: runtimeGlobals,
    },
    rules: { 'no-undef': 'error' },
  },
];
