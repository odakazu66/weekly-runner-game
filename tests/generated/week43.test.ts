// week43 採択提案の回帰テスト
// 既存テストには触らず、受け入れ基準のみ検証する。
import { describe, expect, it } from "vitest";
import { createState, step } from "../../src/core/step";
import type { Params } from "../../src/core/types";

import physics from "../../params/physics.json";
import obstacles from "../../params/obstacles.json";
import difficulty from "../../params/difficulty.json";

const params: Params = { physics, obstacles, difficulty };

describe("week43: ジャンプ高度増加 (jumpVelocity=8.5)", () => {
  it("ジャンプ頂点高さが 80px 超（旧値 7.4 の理論値 ~72px より大きい）", () => {
    let s = createState(1, params);
    s = step(s, { jump: true }, params);
    let peakY = s.player.y;
    for (let i = 0; i < 60; i++) {
      const next = step(s, { jump: false }, params);
      if (next.player.y >= s.player.y) break;
      peakY = next.player.y;
      s = next;
    }
    const groundTop = physics.groundY - physics.player.height;
    const peakHeight = groundTop - peakY;
    expect(peakHeight).toBeGreaterThan(80);
  });
});

describe("week43: 初期猶予期間 (firstSpawnDistance=800)", () => {
  it("最初の 280 tick は障害物ゼロ", () => {
    let s = createState(42, params);
    for (let i = 0; i < 280; i++) {
      s = step(s, { jump: false }, params);
      expect(s.obstacles.length).toBe(0);
    }
  });
});
