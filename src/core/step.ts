// 純関数 step(state, input, params) -> state。
// DOM・Date・Math.random を参照しない（ESLint で機械的に禁止）。時間は tick として state に持つ。

import { aabb, shrink, type Box } from "./collide";
import { rngPickWeighted, rngRange, seedRng, type RngState } from "./rng";
import type { DifficultyPoint, Input, Obstacle, Params, State } from "./types";

export function createState(seed: number, params: Params): State {
  const p = params.physics;
  return {
    tick: 0,
    rng: seedRng(seed),
    alive: true,
    distance: 0,
    speed: params.difficulty.curve[0]?.speed ?? 0,
    player: { y: p.groundY - p.player.height, vy: 0, onGround: true },
    obstacles: [],
    nextSpawnIn: params.obstacles.firstSpawnDistance,
  };
}

/** 距離→(速度, 密度) の折れ線補間。範囲外は端の値で飽和。 */
export function difficultyAt(
  distance: number,
  curve: readonly DifficultyPoint[]
): { speed: number; density: number } {
  const first = curve[0];
  if (!first) return { speed: 0, density: 1 };
  if (distance <= first.distance) return { speed: first.speed, density: first.density };
  for (let i = 1; i < curve.length; i++) {
    const a = curve[i - 1];
    const b = curve[i];
    if (!a || !b) break;
    if (distance <= b.distance) {
      const span = b.distance - a.distance;
      const t = span > 0 ? (distance - a.distance) / span : 1;
      return {
        speed: a.speed + (b.speed - a.speed) * t,
        density: a.density + (b.density - a.density) * t,
      };
    }
  }
  const last = curve[curve.length - 1] ?? first;
  return { speed: last.speed, density: last.density };
}

export function distanceMeters(state: State, params: Params): number {
  return Math.floor(state.distance / params.physics.pixelsPerMeter);
}

function spawnObstacle(rng: RngState, params: Params): { rng: RngState; obstacle: Obstacle } {
  const types = params.obstacles.types;
  const pick = rngPickWeighted(
    rng,
    types.map((t) => t.weight)
  );
  const type = types[pick.value] ?? types[0];
  if (!type) throw new Error("obstacles.types is empty");
  return {
    rng: pick.state,
    obstacle: {
      typeIndex: pick.value,
      x: params.physics.world.width,
      width: type.width,
      height: type.height,
      yOffset: type.yOffset,
    },
  };
}

export function step(state: State, input: Input, params: Params): State {
  if (!state.alive) return state;

  const p = params.physics;
  const { speed, density } = difficultyAt(state.distance, params.difficulty.curve);

  // プレイヤー: タップ＝ジャンプ（接地時のみ）
  let { y, vy, onGround } = state.player;
  if (input.jump && onGround) {
    vy = -p.jumpVelocity;
    onGround = false;
  }
  vy = Math.min(vy + p.gravity, p.maxFallSpeed);
  y += vy;
  const groundTop = p.groundY - p.player.height;
  if (y >= groundTop) {
    y = groundTop;
    vy = 0;
    onGround = true;
  }

  // 障害物: スクロールと画面外削除
  const obstacles: Obstacle[] = [];
  for (const o of state.obstacles) {
    const nx = o.x - speed;
    if (nx + o.width > 0) obstacles.push({ ...o, x: nx });
  }

  // 出現
  let rng = state.rng;
  let nextSpawnIn = state.nextSpawnIn - speed;
  if (nextSpawnIn <= 0) {
    const spawned = spawnObstacle(rng, params);
    rng = spawned.rng;
    obstacles.push(spawned.obstacle);
    const gap = rngRange(rng, params.obstacles.gap.min, params.obstacles.gap.max);
    rng = gap.state;
    nextSpawnIn = gap.value / Math.max(density, 0.01);
  }

  // 衝突
  const playerBox: Box = shrink(
    { x: p.player.x, y, w: p.player.width, h: p.player.height },
    p.hitboxInset
  );
  let alive = true;
  for (const o of obstacles) {
    const box: Box = { x: o.x, y: p.groundY - o.height - o.yOffset, w: o.width, h: o.height };
    if (aabb(playerBox, box)) {
      alive = false;
      break;
    }
  }

  return {
    tick: state.tick + 1,
    rng,
    alive,
    distance: state.distance + speed,
    speed,
    player: { y, vy, onGround },
    obstacles,
    nextSpawnIn,
  };
}
