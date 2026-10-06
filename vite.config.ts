import { defineConfig } from "vite";

// 実行時依存ゼロ。ビルド成果物は dist/ に出力し、gzip 合計 200KB 以下を
// scripts/check-bundle-size.mjs で検査する。
// APP_VERSION は deploy.yml が `v${run_number}` を渡す。未指定なら "dev"。
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env["APP_VERSION"] ?? "dev"),
  },
  build: {
    target: "es2022",
    sourcemap: false,
  },
});
