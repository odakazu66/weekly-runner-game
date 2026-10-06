// シード付き PRNG: mulberry32。
// 状態は 32bit 整数ひとつ。純関数として「次の状態」と「値」を返し、呼び出し側が状態を持ち回る。
// これにより step() が完全決定論（同一 seed + 入力列 → 同一状態列）を満たせる。

export type RngState = number;

export interface RngResult {
  state: RngState;
  /** [0, 1) の一様乱数 */
  value: number;
}

export function seedRng(seed: number): RngState {
  return seed >>> 0;
}

export function nextRng(state: RngState): RngResult {
  const a = (state + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { state: a, value };
}

/** [min, max] の実数一様乱数 */
export function rngRange(state: RngState, min: number, max: number): RngResult {
  const r = nextRng(state);
  return { state: r.state, value: min + (max - min) * r.value };
}

/** 重み付き抽選。戻り値 value は選ばれた index。 */
export function rngPickWeighted(state: RngState, weights: readonly number[]): RngResult {
  const total = weights.reduce((s, w) => s + w, 0);
  const r = nextRng(state);
  let acc = 0;
  const target = r.value * total;
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i] ?? 0;
    if (target < acc) return { state: r.state, value: i };
  }
  return { state: r.state, value: Math.max(0, weights.length - 1) };
}
