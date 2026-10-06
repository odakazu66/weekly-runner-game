import { describe, expect, it } from "vitest";
import { aabb, shrink } from "../../src/core/collide";

describe("aabb", () => {
  const a = { x: 0, y: 0, w: 10, h: 10 };
  it("重なれば true", () => {
    expect(aabb(a, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
    expect(aabb(a, { x: -5, y: -5, w: 10, h: 10 })).toBe(true);
  });
  it("辺が接しているだけなら false（右・下）", () => {
    expect(aabb(a, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
    expect(aabb(a, { x: 0, y: 10, w: 10, h: 10 })).toBe(false);
  });
  it("辺が接しているだけなら false（左・上）", () => {
    expect(aabb(a, { x: -10, y: 0, w: 10, h: 10 })).toBe(false);
    expect(aabb(a, { x: 0, y: -10, w: 10, h: 10 })).toBe(false);
  });
  it("1px でも食い込めば true", () => {
    expect(aabb(a, { x: 9, y: 9, w: 10, h: 10 })).toBe(true);
  });
  it("内包は true、離れていれば false", () => {
    expect(aabb(a, { x: 2, y: 2, w: 2, h: 2 })).toBe(true);
    expect(aabb(a, { x: 100, y: 100, w: 2, h: 2 })).toBe(false);
  });
  it("対称", () => {
    const b = { x: 7, y: -3, w: 4, h: 20 };
    expect(aabb(a, b)).toBe(aabb(b, a));
  });
});

describe("shrink", () => {
  it("inset 分だけ内側に縮む", () => {
    expect(shrink({ x: 0, y: 0, w: 10, h: 10 }, 2)).toEqual({ x: 2, y: 2, w: 6, h: 6 });
  });
  it("幅・高さの半分を超えて縮めない", () => {
    expect(shrink({ x: 0, y: 0, w: 4, h: 10 }, 5)).toEqual({ x: 2, y: 2, w: 0, h: 6 });
  });
});
