#!/usr/bin/env node
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const pagesDir = path.join(projectRoot, 'src', 'pages');
const allowedMarkers = [/setMeta\s*\(/, /usePageMetadata\s*\(/, /SEOHelmet/];
const ignoredDirs = new Set(['__tests__']);

/** @param {string} dir */
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) continue;
      files.push(...await walk(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * @param {string} file
 */
async function hasMetadata(file) {
  const contents = await readFile(file, 'utf8');
  return allowedMarkers.some((pattern) => pattern.test(contents));
}

async function main() {
  try {
    await stat(pagesDir);
  } catch (error) {
    console.error('Unable to locate pages directory at', pagesDir);
    console.error(error);
    process.exit(1);
  }

  const files = await walk(pagesDir);
  const missing = [];
  for (const file of files) {
    if (!(await hasMetadata(file))) {
      missing.push(path.relative(projectRoot, file));
    }
  }

  if (missing.length > 0) {
    console.error('\nThe following route files do not configure SEO metadata:');
    for (const file of missing) {
      console.error(` - ${file}`);
    }
    console.error('\nAdd setMeta/usePageMetadata/SEOHelmet calls before committing.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Failed to verify SEO metadata consistency.');
  console.error(error);
  process.exit(1);
});
