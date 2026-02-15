import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const expectedTag = `v${pkg.version}`;
const actualTag = process.env.GITHUB_REF_NAME ?? process.argv[2] ?? '';

if (!actualTag) {
  console.error('release:check requires a tag (GITHUB_REF_NAME or argv[2]).');
  process.exit(1);
}

if (actualTag !== expectedTag) {
  console.error(`Tag/version mismatch: tag=${actualTag}, expected=${expectedTag}`);
  process.exit(1);
}

const chromeZip = resolve(root, 'artifacts', `youtube-obsidian-chrome-v${pkg.version}.zip`);
const firefoxXpi = resolve(root, 'artifacts', `youtube-obsidian-firefox-v${pkg.version}.xpi`);

for (const file of [chromeZip, firefoxXpi]) {
  if (!existsSync(file)) {
    console.error(`Missing release artifact: ${file}`);
    process.exit(1);
  }
}

console.log(`release:check passed for ${actualTag}`);
