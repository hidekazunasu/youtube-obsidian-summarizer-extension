# 運用手順（開発・CI・リリース）

## 1. 開発環境

- Node.js 20以上（CIは 20 / 22）

```bash
npm install
```

日常チェック:

```bash
npm run typecheck
npm run lint
npm run test
npm run build:all
```

## 2. ローカル動作確認

Chrome:
1. `npm run build:chrome`
2. `chrome://extensions` で `dist/chrome` を読み込む

Firefox:
1. `npm run build:firefox`
2. `about:debugging#/runtime/this-firefox` で `dist/firefox/manifest.json` を読み込む

## 2.1 設定（Notion利用時）

- `Output Destination`: `notion`
- `Notion Parent Page ID`: 連携先ページID
- `Notion API Token`: Notion Integration Token
- Obsidian設定は `outputDestination=obsidian` の時のみ利用される

## 2.2 OpenRouter Model の指定方法

オプション画面の `OpenRouter Model` に、OpenRouterのモデルIDを入力する。

候補:
- `openrouter/free`
- `google/gemini-2.5-pro`
- `google/gemini-2.0-flash-001`
- `google/gemma-3-12b-it:free`
- `deepseek/deepseek-v3.2`
- `deepseek/deepseek-r1`
- `deepseek/deepseek-r1-0528:free`

手順:
1. オプション画面を開く
2. `OpenRouter Model` にモデルIDを入力
3. 保存してYouTubeページで再実行

トラブル時:
- `429`: 無料枠や混雑の可能性。時間を空けるか別モデルへ変更
- `model not found`: モデルIDが無効。最新の OpenRouter Models で確認

## 3. 開発フロー

- デフォルトブランチ: `main`
- 開発ブランチ: `feature/*`
- マージ方法: PR経由

PRルール:
- 変更を小さく保つ
- 仕様変更時は `docs/` を更新
- テストの追加/更新を含める

## 4. CI

対象ワークフロー: `.github/workflows/ci.yml`

- 実行契機: `push`（`main`, `feature/**`）, `pull_request`
- Node matrix: `20`, `22`
- 実行コマンド:
  - `npm install`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
  - `npm run build:all`

## 5. リリース運用

重要:
- `main` へコミットしただけでは GitHub Release は作成されません。
- `v*` タグを push したときだけ `Release` workflow が起動します。

### 5.1 事前確認

- `package.json` の version を確定
- `manifests/manifest.chrome.json` と `manifests/manifest.firefox.json` の version を一致させる
- ローカルで以下を通す

```bash
npm run typecheck
npm run lint
npm run test
npm run package:release
npm run release:check -- v<version>
```

### 5.2 自動リリース（推奨）

1. リリース対象を `main` に反映して push
2. タグを作成して push

```bash
git tag v0.1.1
git push origin v0.1.1
```

3. `.github/workflows/release.yml` が実行される
4. GitHub Releases に以下が添付される
- `youtube-obsidian-chrome-vX.Y.Z.zip`
- `youtube-obsidian-firefox-vX.Y.Z.xpi`

### 5.3 手動リリース（必要時）

1. `npm run package:release`
2. GitHub の `Create a new release`
3. `artifacts/` の成果物を手動アップロード

## 6. AMO 自動公開（Firefox）

対象ワークフロー: `.github/workflows/release.yml`

必要な GitHub Secrets:
- `FIREFOX_EXTENSION_ID`
- `AMO_JWT_ISSUER`
- `AMO_JWT_SECRET`

3つが設定されている場合のみ AMO 公開ステップが実行されます。

## 7. 障害対応

まず確認する情報:
- Alert の表示文言
- 拡張機能の Service Worker ログ

よくある事象:
- `Could not establish connection. Receiving end does not exist.`
  - 拡張機能を更新後、YouTubeタブを再読み込み
  - `dist/chrome` / `dist/firefox` を再読込
- OpenRouter 429
  - 時間を空けて再実行
  - 無料モデルの混雑回避のためモデル変更を検討
- Firefox でアクションボタンが見えない
  - `dist/firefox/manifest.json` を再読込
  - 一時アドオンが消えていないか確認

## 8. GitHub Topics（手動）

GitHub repository Settings で以下を設定:
- `chrome-extension`
- `firefox-extension`
- `obsidian`
- `youtube`
- `typescript`
- `openrouter`
