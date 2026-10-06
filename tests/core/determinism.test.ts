// 決定論テスト（聖域）。固定 seed・固定入力列・固定 params で 1000 tick 進めた状態列のハッシュを
// スナップショットと比較する。step() のロジック変更は必ずここで検知される。
import { describe, expect, it } from "vitest";
import { createState, step } from "../../src/core/step";
import { nextRng, seedRng } from "../../src/core/rng";
import type { Input, State } from "../../src/core/types";
import { FIXED_PARAMS } from "./fixtures/params";

const TICKS = 1000;
// 既知の正解ハッシュ。step() の意図的な仕様変更時のみ、PLAN.md に理由を書いた上で更新してよい。
const EXPECTED_HASH = "1e856cf9";

function fnv1a(hash: number, text: string): number {
  let h = hash;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

function scriptedInput(tick: number): Input {
  return { jump: tick % 37 === 0 || tick % 101 === 5 };
}

function run(seed: number, ticks: number): { final: State; hash: string; deaths: number } {
  let s = createState(seed, FIXED_PARAMS);
  let h = 0x811c9dc5;
  let deaths = 0;
  for (let i = 0; i < ticks; i++) {
    const prevAlive = s.alive;
    s = step(s, scriptedInput(s.tick), FIXED_PARAMS);
    if (prevAlive && !s.alive) deaths++;
    h = fnv1a(h, JSON.stringify(s));
  }
  return { final: s, hash: h.toString(16).padStart(8, "0"), deaths };
}

describe("mulberry32", () => {
  it("同じ seed から同じ列が出る", () => {
    let a = seedRng(123);
    let b = seedRng(123);
    for (let i = 0; i < 100; i++) {
      const ra = nextRng(a);
      const rb = nextRng(b);
      expect(ra.value).toBe(rb.value);
      expect(ra.value).toBeGreaterThanOrEqual(0);
      expect(ra.value).toBeLessThan(1);
      a = ra.state;
      b = rb.state;
    }
  });
  it("既知のベクトル（seed=1 の先頭値）", () => {
    // mulberry32(1) の最初の出力。実装の取り違えを検知する。
    expect(nextRng(seedRng(1)).value).toBeCloseTo(0.6270739405881613, 12);
  });
});

describe("step() の決定論", () => {
  it("同一 seed・同一入力列 → 同一状態列", () => {
    expect(run(42, TICKS).hash).toBe(run(42, TICKS).hash);
  });
  it("異なる seed → 異なる状態列", () => {
    expect(run(42, TICKS).hash).not.toBe(run(43, TICKS).hash);
  });
  it("スナップショットハッシュ一致（1000 tick）", () => {
    const r = run(42, TICKS);
    expect(r.hash).toBe(EXPECTED_HASH);
  });
  it("走れば距離が増え、死後は状態が変化しない", () => {
    const r = run(42, TICKS);
    expect(r.final.distance).toBeGreaterThan(0);
    const after = step(r.final, { jump: true }, FIXED_PARAMS);
    if (!r.final.alive) expect(after).toBe(r.final);
  });
  it("障害物が生成され、やがて衝突で死ぬ（seed 総当たり）", () => {
    let anyDeath = false;
    for (let seed = 1; seed <= 5; seed++) {
      if (run(seed, 3000).deaths > 0) anyDeath = true;
    }
    expect(anyDeath).toBe(true);
  });
});
