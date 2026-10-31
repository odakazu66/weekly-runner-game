# PLAN.md — week 43

## 問い（各提案は何を解決するか）

| # | 提案 | 問題 |
|---|---|---|
| 1 | ジャンプの高度を増加 | 現在の jumpVelocity=7.4 では一部の障害物を越えにくいという不満 |
| 2 | 初期段階の障害物を削減 | ゲーム開始直後に障害物が出現し、新規プレイヤーが慣れる前に死ぬ |
| 3 | 背景色を明るく | 背景 #0f172a（ほぼ黒）では視認性が悪く疲れ目になる |

## 変更内容

| ファイル | Tier | 変更 |
|---|---|---|
| `params/physics.json` | 1 | `jumpVelocity` 7.4 → 8.5 |
| `params/obstacles.json` | 1 | `firstSpawnDistance` 320 → 800 |
| `params/theme.json` | 0 | `palette.bg` `"#0f172a"` → `"#1e293b"` |
| `tests/generated/week43.test.ts` | — | 回帰テスト追加（既存テストには触らない） |

コード変更（Tier 2）なし。スキーマ変更なし。

## 受け入れ基準

1. `jumpVelocity=8.5` でジャンプ頂点高さが旧値(7.4)より大きい（理論値: ~95px vs ~72px）
2. `firstSpawnDistance=800` により最初の 280 tick（約4.7秒相当）は障害物ゼロ
3. `palette.bg="#1e293b"` がスキーマ検証を通過する
4. `npm test && npm run validate:params && npm run build && npm run check:size` 全通過

## リスク

- **jumpVelocity 増加**: 高い障害物（wall: height 40）を越えやすくなる一方、タイミング調整が必要な場面が変わる。ゲームバランスへの影響は軽微と判断。
- **firstSpawnDistance 増加**: 開始直後の「何も起きない時間」が長くなりすぎると退屈に感じる可能性。800→約4.7秒は許容範囲。
- **背景色**: 明るくすることで障害物(#f97316 オレンジ)との対比が若干変わるが、視認性は改善方向。

## ロールバック観点

- JS エラー率: パラメータ変更のみのため上昇リスクなし
- ロード成功率: 変更なし
- 完走率: jumpVelocity 増加で若干上がる可能性あり（有利方向）。firstSpawnDistance 増加も同様。
- 決定論テストのスナップショットハッシュ: FIXED_PARAMS を使用しているため変化しない
