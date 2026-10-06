import { defineConfig } from "vite";

// 実行時依存ゼロ。ビルド成果物は dist/ に出力し、gzip 合計 200KB 以下を
// scripts/check-bundle-size.mjs で検査する（Phase 1 で追加）。
export default defineConfig({
  build: {
    target: "es2022",
    sourcemap: false,
    minify: "esbuild",
  },
});
