# 週刊ランナー game リポジトリ — 週次エージェント向け規約

あなたは週次パイプラインから起動された implementer です。以下を厳守してください。
詳細な規律は platform リポの `pipeline/prompts/implementer.md`、境界は `constitution/constitution.md` にあります。

## Tier 表（可変域）

| Tier | 対象 | ゲート | 週次予算 |
|---|---|---|---|
| 0 | `params/theme.json`, `params/strings.json` | スキーマ検証のみ | 実質無制限 |
| 1 | `params/physics.json`, `params/obstacles.json`, `params/difficulty.json` | Schema＋値域＋プレイテスト | スキーマ内なら無制限 |
| 2 | `src/**` の TS コード（core / render / ui / main / api）、`index.html` / `report.html`、スキーマの**追加的**変更 | フルゲート（回帰＋smoke＋審査LLM） | ≤3ファイル・≤400行 |
| 3 | `tests/core/**`, `.github/**`, `scripts/**`, `e2e/**`, 各種設定（eslint / vitest / playwright / vite / tsconfig）, `CLAUDE.md`, `package.json` の依存, `package-lock.json`, サーバ・台帳・パイプライン・憲法 | **書込不可** | 0 |

- スキーマ変更は追加的のみ（既存キーの削除・既存値域の拡大は禁止。`scripts/guard-diff.mjs` が検知）。
- 棚卸し規約: Tier 2 で実装した新メカニクスは、必ず制御パラメータを `params/` に切り出して Tier 1 化すること。

## 作業規律（R10）

1. 実装前に `PLAN.md` を PR 先頭コミットで作成する: 問い／変更内容／受け入れ基準／リスク／ロールバック観点。
2. 最小 diff。依頼範囲外のリファクタ・整形はしない。
3. `npm test` と `npm run validate:params` を実際に実行し、ログを PR 本文に貼る。「動くはず」は禁止。
4. 既存テストの削除・弱体化・スキップ化は禁止。テストは `tests/generated/` への追加のみ。
5. 無理なら見送り: `{"skip": true, "reason": "..."}` を出力して終了してよい。見送りは失敗ではない。

## 技術上の禁止事項

- `Math.random` の直接使用（ESLint がエラーにする）。乱数は `src/core/rng.ts` のみ。
- `src/core/**` での DOM・Date・localStorage 参照。
- `package.json` の `dependencies` への追加（実行時依存ゼロ）。
- 画像アセットの追加。描画は Canvas 図形合成と `params/theme.json` のパレットのみ。
- 新規のネットワーク送信先の追加。
