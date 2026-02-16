import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const target = process.argv[2] ?? 'all';
const supported = new Set(['chrome', 'firefox', 'all']);

if (!supported.has(target)) {
  console.error(`Unsupported target: ${target}`);
  process.exit(1);
}

const baseDir = resolve(root, 'dist', '_base');
const distDir = resolve(root, 'dist');
const targets = target === 'all' ? ['chrome', 'firefox'] : [target];

run('npm exec vite build -- --outDir dist/_base --emptyOutDir');

for (const browser of targets) {
  const outDir = resolve(distDir, browser);
  rmSync(outDir, { recursive: true, force: true });
  cpSync(baseDir, outDir, { recursive: true });

  // Build always uses browser-specific manifests from manifests/, not root manifest.json.
  const manifestFile = resolve(root, 'manifests', `manifest.${browser}.json`);
  const manifestRaw = readFileSync(manifestFile, 'utf8');
  const manifestPatched = patchManifest(manifestRaw);
  writeFileSync(resolve(outDir, 'manifest.json'), manifestPatched, 'utf8');

  for (const iconName of ['icon-16.png', 'icon-32.png', 'icon-48.png', 'icon-128.png']) {
    cpSync(resolve(root, 'public', iconName), resolve(outDir, iconName));
  }
  smokeCheck(outDir);
  console.log(`Built ${browser}: ${outDir}`);
}

rmSync(baseDir, { recursive: true, force: true });

function patchManifest(raw) {
  const firefoxId =
    process.env.FIREFOX_EXTENSION_ID ?? 'youtube-obsidian-extension@local.invalid';
  return raw.replaceAll('__FIREFOX_EXTENSION_ID__', firefoxId);
}

function smokeCheck(outDir) {
  const required = [
    'manifest.json',
    'background.js',
    'content.js',
    'src/options/index.html',
    'icon-16.png',
    'icon-32.png',
    'icon-48.png',
    'icon-128.png'
  ];

  for (const relative of required) {
    const absolute = resolve(outDir, relative);
    if (!existsSync(absolute)) {
      throw new Error(`Build output missing required file: ${absolute}`);
    }
  }

  const manifestPath = resolve(outDir, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  for (const key of ['manifest_version', 'background', 'content_scripts', 'options_page']) {
    if (!(key in manifest)) {
      throw new Error(`manifest.json missing required field: ${key} (${manifestPath})`);
    }
  }
}

function run(command) {
  execSync(command, { stdio: 'inherit' });
}
