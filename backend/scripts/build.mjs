/**
 * Lightweight build script using esbuild (via tsx's underlying engine).
 * Uses ~50-100MB RAM vs tsc's 1GB+, perfect for low-RAM VPS (2GB).
 * 
 * Transpiles each .ts file individually to .js in dist/,
 * preserving directory structure and .js import extensions.
 */
import { execSync } from 'child_process';
import { readdirSync, statSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { join, dirname, relative, extname } from 'path';

const SRC_DIR = 'src';
const OUT_DIR = 'dist';
const DATA_DIR = join(SRC_DIR, 'data');

// Collect all .ts files recursively
function collectFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectFiles(full, files);
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
      files.push(full);
    }
  }
  return files;
}

// Copy non-ts files (like .json data files) to dist
function copyDataFiles(dir, srcRoot, outRoot) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      copyDataFiles(full, srcRoot, outRoot);
    } else if (!entry.endsWith('.ts')) {
      const rel = relative(srcRoot, full);
      const dest = join(outRoot, rel);
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(full, dest);
    }
  }
}

console.log('Building backend with esbuild...');

// Clean dist
execSync(`rm -rf ${OUT_DIR}`);

// Get all TS files
const files = collectFiles(SRC_DIR);
console.log(`Transpiling ${files.length} files...`);

// Use esbuild directly (installed as dependency of tsx/tsup)
// Transpile all files at once — esbuild handles this in one pass, very fast
const fileList = files.join(' ');
execSync(
  `npx esbuild ${fileList} ` +
  `--outdir=${OUT_DIR} ` +
  `--format=esm ` +
  `--platform=node ` +
  `--target=es2022 ` +
  `--outbase=${SRC_DIR} `,
  { stdio: 'inherit' }
);

// Copy data files (like forum-seed.json)
copyDataFiles(DATA_DIR, SRC_DIR, OUT_DIR);

console.log(`✓ Built ${files.length} files → ${OUT_DIR}/`);
