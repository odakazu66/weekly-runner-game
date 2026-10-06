#!/usr/bin/env node
// params/*.json をスキーマ検証し、スキーマで表せないファイル間整合もチェックする。
// 終了コード 0 = OK, 1 = 違反。
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const load = (p) => JSON.parse(readFileSync(resolve(root, p), "utf8"));

const names = ["physics", "obstacles", "difficulty", "theme", "strings"];
const ajv = new Ajv2020({ allErrors: true, strict: true });
const errors = [];

const params = {};
for (const n of names) {
  const schema = load(`params/schema/${n}.schema.json`);
  const data = load(`params/${n}.json`);
  params[n] = data;
  const validate = ajv.compile(schema);
  if (!validate(data)) {
    for (const e of validate.errors ?? []) {
      errors.push(`${n}.json${e.instancePath || "/"}: ${e.message}`);
    }
  }
}

// ファイル間整合
if (params.obstacles && params.theme) {
  for (const t of params.obstacles.types) {
    if (!params.theme.shapes.obstacles[t.id]) {
      errors.push(`theme.json: obstacles.${t.id} の図形定義がない（obstacles.json の id と一致させること）`);
    }
  }
  if (params.obstacles.gap.min > params.obstacles.gap.max) {
    errors.push("obstacles.json: gap.min > gap.max");
  }
}
if (params.difficulty) {
  const c = params.difficulty.curve;
  for (let i = 1; i < c.length; i++) {
    if (c[i].distance <= c[i - 1].distance) {
      errors.push(`difficulty.json: curve[${i}].distance は昇順でなければならない`);
    }
  }
  if (c.length && c[0].distance !== 0) errors.push("difficulty.json: curve[0].distance は 0 であること");
}
if (params.physics) {
  const p = params.physics;
  if (p.groundY + 1 > p.world.height) errors.push("physics.json: groundY が world.height 以上");
  if (p.player.height >= p.groundY) errors.push("physics.json: player.height が groundY 以上");
  // ジャンプ最高到達点が最も高い障害物を超えられるか（物理的に不可能な配置を防ぐ）
  const apex = (p.jumpVelocity * p.jumpVelocity) / (2 * p.gravity);
  const tallest = Math.max(...params.obstacles.types.map((t) => t.height + t.yOffset));
  if (apex < tallest) errors.push(`physics/obstacles: ジャンプ最高点 ${apex.toFixed(1)}px < 最も高い障害物 ${tallest}px`);
}

if (errors.length) {
  console.error("validate-params: FAIL");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(`validate-params: OK (${names.join(", ")})`);
