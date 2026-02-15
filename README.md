# YouTube to Obsidian Summarizer (MVP)

YouTube動画ページで拡張機能アクションを押すと、字幕を OpenRouter 無料モデルで要約し、Obsidian に保存する Chrome 拡張です。

## Features

- YouTube `watch` ページのみ対応
- OpenRouter API で字幕要約
- Obsidian Local REST API を優先して保存
- REST失敗時に `obsidian://new` へフォールバック

## Setup

1. 依存関係をインストール

```bash
npm install
```

2. ビルド

```bash
npm run build
```

3. Chromeで `chrome://extensions` を開き、デベロッパーモードON
4. `dist` ディレクトリを「パッケージ化されていない拡張機能を読み込む」で読み込み
5. 拡張のオプション画面で以下を設定

- `OpenRouter API Key`
- `OpenRouter Model`（無料モデル推奨）
- `Obsidian Vault Name`
- `Obsidian REST API Key`（REST利用時）

## Development

```bash
npm run dev
npm run test
```

## Notes

- 字幕が取得できない動画は保存しません
- Shorts / Firefox はMVPスコープ外
