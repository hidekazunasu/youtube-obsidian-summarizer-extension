# Contributing

## Development setup

1. Install Node.js 20 or newer (Node 22 also supported in CI).
2. Install dependencies.

```bash
npm install
```

## Local checks

Run these before creating a PR:

```bash
npm run typecheck
npm run lint
npm run test
npm run build:all
```

## Pull request guidelines

- Keep PRs small and focused.
- Include tests for functional changes.
- Update README/docs when behavior or workflows change.
- Prefer conventional commit style when possible.
- Ensure CI passes on Node 20 and Node 22.

## Browser targets

- Chrome MV3
- Firefox MV3

## Repository topics (manual)

Set topics in GitHub:

1. Open repository page.
2. Click the gear icon in the About section.
3. Add topics:
   - `chrome-extension`
   - `firefox-extension`
   - `obsidian`
   - `youtube`
   - `typescript`
   - `openrouter`
