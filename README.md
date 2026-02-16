# YouTube to Obsidian Summarizer

YouTube動画ページで拡張機能アクションを押すと、字幕を OpenRouter で要約し、Obsidian に保存する WebExtension です。

## Supported Browsers

- Chrome (MV3)
- Firefox (MV3)

## Features

- YouTube `watch` ページ対応
- OpenRouter API で字幕要約
- Obsidian Local REST API を優先して保存
- REST失敗時は `obsidian://new` へフォールバック
- 自動タグ付け（`topic/*` + keyword tags）

## Manifest roles

- `manifests/manifest.chrome.json` / `manifests/manifest.firefox.json`
  - 配布用ビルドで使用される正式なマニフェスト
- root `manifest.json`
  - ローカル参照用（非配布）

`npm run build:*` は `scripts/build-browser.mjs` 経由で `manifests/` を参照します。

## Setup

```bash
npm install
```

## Build

```bash
# Chrome only
npm run build:chrome

# Firefox only
npm run build:firefox

# Both
npm run build:all
```

Build outputs:

- `dist/chrome/`
- `dist/firefox/`

## Load Extension Locally

### Chrome

1. `chrome://extensions` を開く
2. デベロッパーモードON
3. 「パッケージ化されていない拡張機能を読み込む」で `dist/chrome` を選択

### Firefox

1. `about:debugging#/runtime/this-firefox` を開く
2. 「一時的なアドオンを読み込む」
3. `dist/firefox/manifest.json` を選択

## Quality checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build:all
```

## Release

```bash
npm run package:release
```

Artifacts:

- `artifacts/youtube-obsidian-chrome-vX.Y.Z.zip`
- `artifacts/youtube-obsidian-firefox-vX.Y.Z.xpi`

CI/Release details: `docs/release.md`

## GitHub topics (manual)

GitHub の repository Settings で以下 topics を手動設定してください。

- `chrome-extension`
- `firefox-extension`
- `obsidian`
- `youtube`
- `typescript`
- `openrouter`
