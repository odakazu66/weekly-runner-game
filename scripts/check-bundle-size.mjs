#!/usr/bin/env node
// dist/ 配下の配信物の gzip 合計が 200KB 以下であることを検査する（憲法第6条）。
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const LIMIT = 200 * 1024;
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

let files;
try {
  files = walk(dist);
} catch {
  console.error("check-bundle-size: dist/ がありません。先に npm run build を実行してください。");
  process.exit(1);
}

let total = 0;
const rows = [];
for (const f of files) {
  const raw = readFileSync(f);
  const gz = gzipSync(raw).length;
  total += gz;
  rows.push({ file: relative(dist, f), raw: raw.length, gzip: gz });
}
rows.sort((a, b) => b.gzip - a.gzip);
for (const r of rows) console.log(`${String(r.gzip).padStart(8)} gz  ${String(r.raw).padStart(8)} raw  ${r.file}`);
console.log(`total gzip: ${total} bytes (limit ${LIMIT})`);
if (total > LIMIT) {
  console.error("check-bundle-size: FAIL");
  process.exit(1);
}
console.log("check-bundle-size: OK");
