// Phase 0 の雛形テスト。Phase 1 で determinism / collide / schema テストに置き換える。
import { describe, it, expect } from "vitest";

describe("scaffold", () => {
  it("vitest が動作する", () => {
    expect(1 + 1).toBe(2);
  });
});
