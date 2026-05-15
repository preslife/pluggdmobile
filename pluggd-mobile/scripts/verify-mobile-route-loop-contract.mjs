import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const repoRoot = new URL('../', import.meta.url).pathname;
const appRoot = join(repoRoot, 'app');

function listFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...listFiles(path));
    else if (/\.(tsx|ts)$/.test(entry)) files.push(path);
  }
  return files;
}

function routeForFile(file) {
  let route = relative(appRoot, file).replace(/\.(tsx|ts)$/, '');
  route = route.replace(/\/index$/, '');
  route = route
    .split('/')
    .map((part) => (part.startsWith('(') && part.endsWith(')') ? part : part))
    .join('/');
  return `/${route}`.replace(/\/$/, '') || '/';
}

const redirects = new Map();

for (const file of listFiles(appRoot)) {
  const source = readFileSync(file, 'utf8');
  const match = source.match(/<Redirect\s+href=(?:["']([^"']+)["']|\{["']([^"']+)["']\})/);
  if (match) redirects.set(routeForFile(file), match[1] || match[2]);
}

const loops = [];
for (const start of redirects.keys()) {
  const seen = new Set();
  let current = start;
  while (redirects.has(current)) {
    if (seen.has(current)) {
      loops.push([...seen, current].join(' -> '));
      break;
    }
    seen.add(current);
    current = redirects.get(current);
  }
}

assert.deepEqual(loops, [], `Redirect loops detected:\n${loops.join('\n')}`);

console.log('mobile route-loop contract verified');
