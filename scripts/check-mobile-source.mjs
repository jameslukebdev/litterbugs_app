import { readFileSync, readdirSync } from 'node:fs';
import { Linter } from 'eslint';
const linter = new Linter();
const globals = ['module','crypto','Response','__DEV__','console','setTimeout','clearTimeout','setInterval','clearInterval','fetch','AbortController','URL','URLSearchParams','require','Buffer','process','window','document','FormData','navigator','XMLHttpRequest','WebSocket','global','alert','requestAnimationFrame','cancelAnimationFrame','performance','TextEncoder','Blob','atob','btoa'];
let failures = 0, checked = 0;
function scan(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (['node_modules','ios','android','.expo','dist'].includes(entry.name)) continue;
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) { scan(path); continue; }
    if (!/\.(js|jsx)$/.test(path) || /\.test\.|test-support/.test(path)) continue;
    checked++;
    const messages = linter.verify(readFileSync(path,'utf8'), [{ files:['**/*.{js,jsx}'],languageOptions:{ecmaVersion:2022,sourceType:'module',parserOptions:{ecmaFeatures:{jsx:true}},globals:Object.fromEntries(globals.map(name=>[name,'readonly']))},rules:{'no-undef':'error'}}],{filename:path});
    for (const message of messages) { failures++; console.error(`${path}:${message.line} ${message.message}`); }
  }
}
scan('apps/mobile');
console.log(`Checked ${checked} mobile modules; ${failures} errors.`);
process.exitCode = failures ? 1 : 0;
