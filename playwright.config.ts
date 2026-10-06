import { defineConfig } from "@playwright/test";

// コンテナ等でプリインストール Chromium を使う場合は PW_CHROMIUM_PATH に実行ファイルを指定する。
// 例: PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:e2e
const exe = process.env["PW_CHROMIUM_PATH"];

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4173",
    viewport: { width: 800, height: 450 },
    hasTouch: true,
    ...(exe ? { launchOptions: { executablePath: exe } } : {}),
  },
  webServer: {
    command: "npm run build && npm run preview -- --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
