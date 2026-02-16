# Release and Distribution

## Branching and PR policy

- Default branch: `main`
- Feature work: `feature/*`
- Merge policy: PR required with at least 1 review
- Required checks: CI (`npm run typecheck`, `npm run lint`, `npm run test`, `npm run build:all`)

## Versioning

- Source of truth: `package.json` `version`
- Release tag format: `vX.Y.Z`
- `vX.Y.Z` must match `package.json` version exactly

## Build outputs

`npm run build:all` creates:

- `dist/chrome/`
- `dist/firefox/`

`npm run package:release` creates:

- `artifacts/youtube-obsidian-chrome-vX.Y.Z.zip`
- `artifacts/youtube-obsidian-firefox-vX.Y.Z.xpi`

## GitHub Actions

### CI (`.github/workflows/ci.yml`)

- Trigger: push / pull_request
- Matrix: Node `20` / `22`
- Steps: install, typecheck, lint, test, build all

### Release (`.github/workflows/release.yml`)

- Trigger: tag push `v*`
- Steps: test, package, release check, upload release assets
- Optional AMO publish when secrets are configured

## Required secrets for AMO auto publish

- `FIREFOX_EXTENSION_ID`
- `AMO_JWT_ISSUER`
- `AMO_JWT_SECRET`

`FIREFOX_EXTENSION_ID` must match `browser_specific_settings.gecko.id` in the Firefox manifest generated at build time.

## Local release dry-run

```bash
npm run test
npm run package:release
npm run release:check -- v$(node -p "require('./package.json').version")
```
