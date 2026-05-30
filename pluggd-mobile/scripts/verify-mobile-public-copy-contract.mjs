#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

const root = new URL('../', import.meta.url).pathname;
const roots = ['app', 'components', 'src/features', 'src/screens', 'src/lib'].map((path) => join(root, path));
const banned = [
  /\bnative translation\b/i,
  /\bno fake checkout\b/i,
  /\bunsupported payment\b/i,
  /\bnative\b/i,
  /\bprivate data\b/i,
  /\bheavy operations\b/i,
  /\bheavy creator operations\b/i,
  /\bhidden or clearly labelled\b/i,
  /\bApp Review\b/i,
  /\bApple IAP\b/i,
  /\bApple-backed\b/i,
  /\bexternal checkout\b/i,
  /\bnative entitlement\b/i,
  /\bpayment contract\b/i,
  /\bweb-only\b/i,
  /\bbackend contract\b/i,
  /\bcurrent backend\b/i,
  /\bmobile backend\b/i,
  /\bbackend\b/i,
  /\bcontract\b/i,
  /\bfaked\b/i,
  /\bweb app\b/i,
];

const ignoredFiles = new Set([
  'src/lib/supabase.ts',
  'src/lib/storage.ts',
]);

function collectFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) collectFiles(full, out);
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(full);
  }
  return out;
}

function literalText(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isJsxText(node)) return node.getText().replace(/\s+/g, ' ').trim();
  return null;
}

function isNonCopyToken(text) {
  return /^[\w@./:+-]+$/.test(text);
}

function insideConsoleCall(node) {
  let current = node.parent;
  while (current) {
    if (
      ts.isCallExpression(current) &&
      ts.isPropertyAccessExpression(current.expression) &&
      current.expression.expression.getText() === 'console'
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

const failures = [];
for (const file of roots.flatMap((dir) => collectFiles(dir))) {
  const rel = relative(root, file);
  if (ignoredFiles.has(rel)) continue;
  const source = readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

  function visit(node) {
    const text = literalText(node);
    if (text && !isNonCopyToken(text) && !insideConsoleCall(node)) {
      for (const pattern of banned) {
        if (pattern.test(text)) {
          const { line, character } = ast.getLineAndCharacterOfPosition(node.getStart(ast));
          failures.push(`${rel}:${line + 1}:${character + 1} contains public/internal copy "${text}"`);
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(ast);
}

assert.deepEqual(failures, [], `Internal implementation copy found in public UI strings:\n${failures.join('\n')}`);
console.log('mobile public copy contract verified');
