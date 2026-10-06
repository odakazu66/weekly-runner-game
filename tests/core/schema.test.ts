// params/*.json が各スキーマに適合すること、およびスキーマが意図どおり「拒否」できることを確認する。
import { describe, expect, it } from "vitest";
import Ajv2020 from "ajv/dist/2020";

import physics from "../../params/physics.json";
import obstacles from "../../params/obstacles.json";
import difficulty from "../../params/difficulty.json";
import theme from "../../params/theme.json";
import strings from "../../params/strings.json";

import physicsSchema from "../../params/schema/physics.schema.json";
import obstaclesSchema from "../../params/schema/obstacles.schema.json";
import difficultySchema from "../../params/schema/difficulty.schema.json";
import themeSchema from "../../params/schema/theme.schema.json";
import stringsSchema from "../../params/schema/strings.schema.json";

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validators = {
  physics: ajv.compile(physicsSchema),
  obstacles: ajv.compile(obstaclesSchema),
  difficulty: ajv.compile(difficultySchema),
  theme: ajv.compile(themeSchema),
  strings: ajv.compile(stringsSchema),
};

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

describe("params は各スキーマに適合する", () => {
  it("physics", () => expect(validators.physics(physics), JSON.stringify(validators.physics.errors)).toBe(true));
  it("obstacles", () => expect(validators.obstacles(obstacles), JSON.stringify(validators.obstacles.errors)).toBe(true));
  it("difficulty", () => expect(validators.difficulty(difficulty), JSON.stringify(validators.difficulty.errors)).toBe(true));
  it("theme", () => expect(validators.theme(theme), JSON.stringify(validators.theme.errors)).toBe(true));
  it("strings", () => expect(validators.strings(strings), JSON.stringify(validators.strings.errors)).toBe(true));
});

describe("スキーマは不正を拒否する", () => {
  it("theme: 未知キー（画像パスの持ち込み口）を拒否", () => {
    const t = clone(theme) as Record<string, unknown>;
    t["image"] = "player.png";
    expect(validators.theme(t)).toBe(false);
  });
  it("theme: 図形に url プロパティを持ち込めない", () => {
    const t = clone(theme) as { shapes: { player: Record<string, unknown>[] } };
    t.shapes.player[0]!["url"] = "https://example.com/x.png";
    expect(validators.theme(t)).toBe(false);
  });
  it("theme: 色はパレットキーのみ（生の色文字列や URL は不可）", () => {
    const t = clone(theme) as { shapes: { player: Record<string, unknown>[] } };
    t.shapes.player[0]!["color"] = "url(x.png)";
    expect(validators.theme(t)).toBe(false);
  });
  it("theme: パレット値は #RRGGBB のみ", () => {
    const t = clone(theme) as { palette: Record<string, string> };
    t.palette["bg"] = "url(bg.png)";
    expect(validators.theme(t)).toBe(false);
  });
  it("physics: 値域外を拒否", () => {
    const p = clone(physics);
    p.gravity = 99;
    expect(validators.physics(p)).toBe(false);
  });
  it("strings: URL を含む文言を拒否（憲法第2条）", () => {
    const s = clone(strings);
    s.subtitle = "詳しくは https://example.com へ";
    expect(validators.strings(s)).toBe(false);
  });
  it("obstacles: 空の types を拒否", () => {
    const o = clone(obstacles);
    o.types = [];
    expect(validators.obstacles(o)).toBe(false);
  });
});
