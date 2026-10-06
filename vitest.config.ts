import { defineConfig } from "vitest/config";

// tests/core = 聖域（週次エージェント変更不可）、tests/generated = 週次エージェントの回帰テスト置き場
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
