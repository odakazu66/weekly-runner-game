#!/usr/bin/env node
// PR の diff を検査し、週次エージェントが境界（Tier 制）を越えていないか機械的に判定する。
// 環境変数 GUARD_BASE（既定 origin/main）と GUARD_HEAD（既定 HEAD）の間の差分を見る。
// 違反があれば理由を列挙して exit 1。
import { execFileSync } from "node:child_process";

const BASE = process.env.GUARD_BASE ?? "origin/main";
const HEAD = process.env.GUARD_HEAD ?? "HEAD";

// 書込不可（Tier 3）。
const PROTECTED = [/^\.github\//, /^tests\/core\//, /^scripts\/guard-diff\.mjs$/, /^CLAUDE\.md$/, /^package-lock\.json$/];
// Tier 0/1 とエージェントの作業ファイル。予算に数えない。
const FREE = [/^params\/(theme|strings|physics|obstacles|difficulty)\.json$/, /^tests\/generated\//, /^PLAN\.md$/, /^REPORT_DRAFT\.md$/];
const SCHEMA = /^params\/schema\/.+\.schema\.json$/;
const TIER2_MAX_FILES = 3;
const TIER2_MAX_LINES = 400;

const git = (...args) => execFileSync("git", args, { encoding: "utf8" });

// モノレポのサブディレクトリから実行された場合も、このディレクトリをルートとみなす。
// --relative で差分パスを cwd 相対にし、外側の変更は対象外にする。git show には repo ルート相対が必要なので prefix を付ける。
const PREFIX = git("rev-parse", "--show-prefix").trim();

function show(ref, path) {
  try {
    return git("show", `${ref}:${PREFIX}${path}`);
  } catch {
    return null;
  }
}

const violations = [];
const nameStatus = git("diff", "--relative", "--name-status", "-M", BASE, HEAD).trim();
if (!nameStatus) {
  console.log("guard-diff: 変更なし");
  process.exit(0);
}
const numstat = git("diff", "--relative", "--numstat", "-M", BASE, HEAD).trim().split("\n").filter(Boolean);
const lines = new Map();
for (const row of numstat) {
  const [add, del, ...rest] = row.split("\t");
  const path = rest.join("\t").replace(/^.*=> /, "").replace(/[{}]/g, "");
  lines.set(path, (add === "-" ? 0 : Number(add)) + (del === "-" ? 0 : Number(del)));
}

const changed = [];
for (const row of nameStatus.split("\n")) {
  const parts = row.split("\t");
  const status = parts[0];
  const path = parts[parts.length - 1];
  const oldPath = status.startsWith("R") ? parts[1] : path;
  changed.push({ status, path, oldPath });
}

let tier2Files = 0;
let tier2Lines = 0;
for (const c of changed) {
  for (const p of new Set([c.path, c.oldPath])) {
    if (PROTECTED.some((re) => re.test(p))) violations.push(`protected path を変更: ${p} (${c.status})`);
  }
  if (FREE.some((re) => re.test(c.path))) continue;
  if (SCHEMA.test(c.path)) {
    checkSchemaAdditive(c);
    continue;
  }
  if (c.path === "package.json") {
    checkPackageJson();
  }
  tier2Files += 1;
  tier2Lines += lines.get(c.path) ?? 0;
}
if (tier2Files > TIER2_MAX_FILES) violations.push(`Tier 2 予算超過: ${tier2Files} ファイル > ${TIER2_MAX_FILES}`);
if (tier2Lines > TIER2_MAX_LINES) violations.push(`Tier 2 予算超過: ${tier2Lines} 行 > ${TIER2_MAX_LINES}`);

function checkPackageJson() {
  const before = JSON.parse(show(BASE, "package.json") ?? "{}");
  const after = JSON.parse(show(HEAD, "package.json") ?? "{}");
  const depsBefore = JSON.stringify(before.dependencies ?? {});
  const depsAfter = JSON.stringify(after.dependencies ?? {});
  if (depsBefore !== depsAfter) violations.push("package.json: dependencies の変更（実行時依存ゼロ）");
  if (JSON.stringify(before.devDependencies ?? {}) !== JSON.stringify(after.devDependencies ?? {})) {
    violations.push("package.json: devDependencies の変更（ビルド依存はロック固定）");
  }
}

// スキーマは「追加的変更」のみ: キー削除・値域拡大・required 削除・additionalProperties の緩和を禁止。
function checkSchemaAdditive(c) {
  if (c.status.startsWith("D")) {
    violations.push(`schema 削除: ${c.path}`);
    return;
  }
  if (c.status.startsWith("A")) return; // 新規スキーマ追加は許容
  const before = JSON.parse(show(BASE, c.oldPath) ?? "null");
  const after = JSON.parse(show(HEAD, c.path) ?? "null");
  if (!before || !after) return;
  compareNode(before, after, c.path);
}

function compareNode(a, b, where) {
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) return;
  if (a.type !== undefined && JSON.stringify(a.type) !== JSON.stringify(b.type)) violations.push(`${where}: type 変更`);
  if (a.additionalProperties === false && b.additionalProperties !== false) violations.push(`${where}: additionalProperties の緩和`);
  if (Array.isArray(a.required)) {
    for (const r of a.required) if (!(b.required ?? []).includes(r)) violations.push(`${where}: required から ${r} を削除`);
  }
  if (Array.isArray(a.enum)) {
    if (!Array.isArray(b.enum)) violations.push(`${where}: enum の撤廃`);
    else for (const v of b.enum) if (!a.enum.includes(v)) violations.push(`${where}: enum に ${JSON.stringify(v)} を追加（値域拡大）`);
  }
  if (a.pattern !== undefined && a.pattern !== b.pattern) violations.push(`${where}: pattern 変更`);
  if (a.const !== undefined && JSON.stringify(a.const) !== JSON.stringify(b.const)) violations.push(`${where}: const 変更`);
  const wider = [
    ["minimum", (x, y) => y < x], ["exclusiveMinimum", (x, y) => y < x], ["minLength", (x, y) => y < x], ["minItems", (x, y) => y < x], ["minProperties", (x, y) => y < x],
    ["maximum", (x, y) => y > x], ["exclusiveMaximum", (x, y) => y > x], ["maxLength", (x, y) => y > x], ["maxItems", (x, y) => y > x],
  ];
  for (const [k, isWider] of wider) {
    if (a[k] !== undefined && (b[k] === undefined || isWider(a[k], b[k]))) violations.push(`${where}: ${k} の値域拡大 (${a[k]} → ${b[k]})`);
  }
  if (a.properties) {
    for (const [k, sub] of Object.entries(a.properties)) {
      if (!b.properties || !(k in b.properties)) violations.push(`${where}: properties.${k} を削除`);
      else compareNode(sub, b.properties[k], `${where}/properties/${k}`);
    }
  }
  if (a.$defs) {
    for (const [k, sub] of Object.entries(a.$defs)) {
      if (!b.$defs || !(k in b.$defs)) violations.push(`${where}: $defs.${k} を削除`);
      else compareNode(sub, b.$defs[k], `${where}/$defs/${k}`);
    }
  }
  if (a.items && b.items) compareNode(a.items, b.items, `${where}/items`);
  if (typeof a.additionalProperties === "object" && typeof b.additionalProperties === "object") {
    compareNode(a.additionalProperties, b.additionalProperties, `${where}/additionalProperties`);
  }
  if (Array.isArray(a.oneOf)) {
    if (!Array.isArray(b.oneOf) || b.oneOf.length < a.oneOf.length) violations.push(`${where}: oneOf の分岐を削除`);
    else a.oneOf.forEach((sub, i) => compareNode(sub, b.oneOf[i], `${where}/oneOf/${i}`));
  }
}

console.log(`guard-diff: ${BASE}..${HEAD}  changed=${changed.length}  tier2Files=${tier2Files}  tier2Lines=${tier2Lines}`);
if (violations.length) {
  console.error("guard-diff: FAIL");
  for (const v of violations) console.error("  - " + v);
  process.exit(1);
}
console.log("guard-diff: OK");
