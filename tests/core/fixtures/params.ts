// 決定論テスト専用の固定パラメータ。
// params/*.json を参照しない理由: Tier 1 の調整（週次エージェントが行う）でコアテストが
// 壊れてはならない。ここはコアロジックの回帰だけを検知する聖域なので、入力を完全に固定する。
import type { Params } from "../../../src/core/types";

export const FIXED_PARAMS: Params = {
  physics: {
    world: { width: 400, height: 240 },
    gravity: 0.4,
    jumpVelocity: 7,
    maxFallSpeed: 10,
    player: { x: 60, width: 20, height: 28 },
    groundY: 200,
    hitboxInset: 2,
    pixelsPerMeter: 10,
  },
  obstacles: {
    types: [
      { id: "a", weight: 3, width: 20, height: 20, yOffset: 0 },
      { id: "b", weight: 1, width: 12, height: 36, yOffset: 0 },
      { id: "c", weight: 1, width: 40, height: 10, yOffset: 30 },
    ],
    gap: { min: 160, max: 240 },
    firstSpawnDistance: 300,
  },
  difficulty: {
    curve: [
      { distance: 0, speed: 3, density: 1 },
      { distance: 5000, speed: 5, density: 1.5 },
    ],
  },
};
