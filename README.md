# 週刊ランナー（Weekly Runner）— game

タップでジャンプするだけのワンタップランナー。**毎週、プレイヤーの意見と投票をもとに LLM が実装・配信する**自己進化型ゲームの「ゲーム本体」リポジトリです。

- 実行時依存ゼロの Vanilla TypeScript + Canvas 2D。画像アセットなし（`params/theme.json` の図形合成）。
- ゲームのパラメータは `params/*.json`、その値域は `params/schema/*.schema.json`。
- 週次エージェント（Claude Code）はこのリポジトリに PR を作ります。境界は `CLAUDE.md` と `scripts/guard-diff.mjs`、憲法は platform リポジトリにあります。

```bash
npm ci
npm run dev          # http://localhost:5173（/api は :8000 の platform サーバへプロキシ）
npm test && npm run validate:params && npm run test:e2e
```
