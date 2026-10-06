// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "test-results/**", "playwright-report/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // 全ファイル共通: Math.random の直接使用を機械的に禁止（R1）。
    // 乱数は src/core/rng.ts の mulberry32 のみを使う。
    files: ["**/*.{ts,mts,js,mjs}"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "Math",
          property: "random",
          message: "Math.random は禁止。src/core/rng.ts のシード付き PRNG (mulberry32) を使うこと。",
        },
      ],
    },
  },
  {
    // コア（純関数 step）は決定論を守るため DOM・時刻・乱数への参照を禁止（§5）。
    files: ["src/core/**/*.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "Date", message: "core では Date 参照禁止。時間は tick 番号として注入する。" },
        { name: "window", message: "core では DOM 参照禁止。" },
        { name: "document", message: "core では DOM 参照禁止。" },
        { name: "localStorage", message: "core では localStorage 参照禁止。" },
        { name: "performance", message: "core では時刻参照禁止。" },
        { name: "requestAnimationFrame", message: "core ではループ制御を行わない。" },
      ],
    },
  }
);
