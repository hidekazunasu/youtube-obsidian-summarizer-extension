# 仕様書

## 1. 目的

YouTube動画ページで取得した字幕を LLM で要約し、Obsidian または Notion へ保存する WebExtension（Chrome / Firefox 対応）。

## 2. 対応範囲

- ブラウザ: Chrome (MV3), Firefox (MV3)
- 対象ページ: `https://www.youtube.com/watch*`
- 実行方法: 拡張機能アクション（ツールバーアイコン）クリック

## 3. 機能要件

1. 字幕取得
- 字幕トラック (`captionTracks`) から取得
- 失敗時は `api/timedtext` から取得
- さらに失敗時は文字起こしパネル DOM から取得

2. 要約
- OpenRouter Chat Completions API を利用
- `response_format: { type: "json_object" }` を指定
- `summaryLanguage` で指定した言語で出力するようプロンプトで強制
- `summaryCustomInstruction` で要約の追記事項を指定可能
- 指定言語と実際の出力言語がズレた可能性を検知した場合は、完了通知へ注意文を追記
- 出力フィールド:
  - `summary_lines`（3-5）
  - `key_points`（5-10）
  - `keywords`（3-8）
  - `broad_tags`（2-6）

3. 保存先
- 出力先は `outputDestination` で選択（`obsidian` / `notion`）

4. Obsidian保存
- 優先: Obsidian Local REST API (`PUT /vault/...`)
- 失敗時: `obsidian://new` URI フォールバック
- URI長上限超過時は失敗（トランケーションしない）

5. Notion保存
- `POST https://api.notion.com/v1/pages`
- 親指定: `parent.page_id = notionParentPageId`
- ノート本文を段落ブロック化して保存

6. ノート生成
- Frontmatter:
  - `source`, `video_id`, `title`, `channel`, `url`, `saved_at`, `model`
- 本文:
  - `## Summary`
  - `## Key Points`
  - `## Keywords`
  - `# Tag`（`#youtube #topic/... #keyword`）
  - `## Source`

7. エラー表示
- 失敗時は `alert` を表示
- `alert` 注入失敗時はバッジ `!` とタイトルでフォールバック

## 4. セキュリティ仕様

- APIキー保存先:
  - `openrouterApiKey`: `storage.local`
  - `obsidianRestApiKey`: `storage.local`
  - `notionApiToken`: `storage.local`
- 公開設定保存先:
  - `storage.sync` (`settings_public`)
- 互換移行:
  - 旧 `settings` が存在する場合、初回読込で `settings_public/settings_secrets` に移行

## 5. データモデル

- `settings_public` (`storage.sync`)
  - `openrouterModel`, `outputDestination`, `summaryCustomInstruction`, `obsidianVaultName`, `obsidianFolderPattern`, `obsidianFilenamePattern`, `obsidianRestEnabled`, `obsidianRestBaseUrl`, `notionParentPageId`, `summaryLanguage`
- `settings_secrets` (`storage.local`)
  - `openrouterApiKey`, `obsidianRestApiKey`, `notionApiToken`
- `last_error_record` (`storage.local`)
  - `at`, `text`

## 6. リトライ/制御仕様

- OpenRouter リトライ:
  - 対象: 429 または 5xx、ネットワーク失敗
  - 最大: 3回
  - バックオフ: `500ms, 1000ms, 2000ms + jitter`
- Transcript入力上限:
  - 30,000文字で切り詰め

## 7. マニフェスト構成

- 正式マニフェスト:
  - `manifests/manifest.chrome.json`
  - `manifests/manifest.firefox.json`
- ルート `manifest.json`:
  - ローカル参照用（非配布）
- ビルド参照元:
  - `scripts/build-browser.mjs` が `manifests/` を参照

## 8. 主要ファイル

- Background: `src/background/service-worker.ts`
- Content: `src/content/youtube.ts`
- LLM連携: `src/lib/openrouter.ts`
- Obsidian保存: `src/lib/obsidian.ts`
- Notion保存: `src/lib/notion.ts`
- 設定管理: `src/lib/settings.ts`
- ノート生成: `src/lib/note.ts`
- API互換層: `src/lib/webext-api.ts`

## 9. 既知の制約

- 字幕が YouTube 側で外部取得不可な動画は保存不可
- 一時アドオン（Firefox）は再起動で消える
- OpenRouter無料枠はレート制限を受ける場合がある
- Google Docs 出力は未対応（次フェーズ）
