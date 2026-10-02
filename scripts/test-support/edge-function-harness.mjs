import { readFileSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';

const functionsRoot = fileURLToPath(new URL('../../supabase/functions/', import.meta.url));

// Execute the actual TypeScript modules with dependency boundaries supplied by
// each test. No network, production environment, SDK client or server is exposed.
export function edgeHarness({ mocks = {}, env = {} } = {}) {
  const cache = new Map();
  let handler;
  const logs = [];
  const sandbox = vm.createContext({
    Request, Response, Headers, URL, URLSearchParams, TextEncoder, TextDecoder,
    crypto: webcrypto, btoa, atob,
    console: { error: (...args) => logs.push(args), log: (...args) => logs.push(args) },
    Deno: {
      env: { get: (name) => env[name] },
      serve: (callback) => { handler = callback; },
    },
    fetch: () => { throw new Error('Network is forbidden in payout fixtures'); },
  });
  function load(name) {
    const path = resolve(functionsRoot, name);
    if (relative(functionsRoot, path).startsWith('..')) throw new Error('Module outside Edge Functions');
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (cache.has(path)) return cache.get(path).exports;
    const module = { exports: {} };
    cache.set(path, module);
    const result = ts.transpileModule(readFileSync(path, 'utf8'), {
      fileName: path,
      reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    });
    const errors = (result.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error);
    if (errors.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(errors, {
      getCanonicalFileName: (f) => f, getCurrentDirectory: () => functionsRoot, getNewLine: () => '\n',
    }));
    const requireModule = (specifier) => {
      if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
      if (specifier === 'jsr:@supabase/functions-js/edge-runtime.d.ts') return {};
      if (!specifier.startsWith('.')) throw new Error(`Unmocked external dependency: ${specifier}`);
      return load(relative(functionsRoot, resolve(dirname(path), specifier)));
    };
    new vm.Script(`(function(require,module,exports){${result.outputText}\n})`, { filename: path })
      .runInContext(sandbox)(requireModule, module, module.exports);
    return module.exports;
  }
  return { load, logs, handle: (request) => {
    if (!handler) throw new Error('No handler registered');
    return handler(request);
  } };
}

export const plain = (value) => JSON.parse(JSON.stringify(value));
