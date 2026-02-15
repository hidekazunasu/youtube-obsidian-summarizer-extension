import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const version = pkg.version;

const chromeDir = resolve(root, 'dist', 'chrome');
const firefoxDir = resolve(root, 'dist', 'firefox');
const artifactsDir = resolve(root, 'artifacts');

if (!existsSync(chromeDir) || !existsSync(firefoxDir)) {
  run('npm run build:all');
}

mkdirSync(artifactsDir, { recursive: true });

const chromeZip = `youtube-obsidian-chrome-v${version}.zip`;
const firefoxXpi = `youtube-obsidian-firefox-v${version}.xpi`;

rmSync(resolve(artifactsDir, chromeZip), { force: true });
rmSync(resolve(artifactsDir, firefoxXpi), { force: true });

run(`cd dist/chrome && zip -rq ../../artifacts/${chromeZip} .`);
run(`cd dist/firefox && zip -rq ../../artifacts/${firefoxXpi} .`);

console.log(`Created artifacts/${chromeZip}`);
console.log(`Created artifacts/${firefoxXpi}`);

function run(command) {
  execSync(command, { stdio: 'inherit' });
}
