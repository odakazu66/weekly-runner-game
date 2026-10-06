// Playwright smoke: ロード → console error 0 → 自動タップ 10 秒 → run_end 発火 → 距離 > 0。
import { expect, test } from "@playwright/test";

interface Telemetry {
  event: string;
  version: string;
  ts: number;
  meta?: Record<string, number | string>;
}

declare global {
  interface Window {
    __wrEvents: Telemetry[];
  }
}

test("smoke: ロードして遊べて run_end が出る", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("response", (r) => {
    if (r.status() >= 400 && !new URL(r.url()).pathname.startsWith("/api/")) errors.push(`HTTP ${r.status()} ${r.url()}`);
  });

  await page.addInitScript(() => {
    window.__wrEvents = [];
    document.addEventListener("wr:telemetry", (e) => {
      window.__wrEvents.push((e as CustomEvent<Telemetry>).detail);
    });
  });

  // API はモック（smoke はサーバなしで完結させる）。telemetry POST の到達を記録して配線を検証する。
  const posted: string[] = [];
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname === "/api/user" && req.method() === "POST") {
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ uuid: "e2e-0000-uuid" }) });
    }
    if (url.pathname === "/api/ballot") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ open: false, week: 40, server_time: 0, opens_at: 0, closes_at: 0, proposals: [] }) });
    }
    if (url.pathname === "/api/telemetry" && req.method() === "POST") {
      const body = JSON.parse(req.postData() ?? "{}") as { event?: string; uuid?: string };
      if (body.uuid === "e2e-0000-uuid" && body.event) posted.push(body.event);
      return route.fulfill({ status: 204, body: "" });
    }
    return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ detail: "mock" }) });
  });

  await page.goto("/");
  await expect(page.locator("#start")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__wrEvents.map((e) => e.event))).toContain("page_load");

  await page.locator("#start").click();
  await expect(page.locator("#title")).toBeHidden();

  // 10 秒間、約 300ms 間隔で自動タップ。途中で死んだら打ち切る。
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (await page.locator("#gameover").isVisible()) break;
    await page.locator("#game").dispatchEvent("pointerdown");
    await page.waitForTimeout(300);
  }
  // タップをやめて最初の障害物に当たるのを待つ
  await expect(page.locator("#gameover")).toBeVisible({ timeout: 30_000 });

  const events = await page.evaluate(() => window.__wrEvents);
  expect(events.some((e) => e.event === "run_start")).toBe(true);
  const runEnd = events.find((e) => e.event === "run_end");
  expect(runEnd).toBeDefined();
  expect(Number(runEnd?.meta?.["distance"])).toBeGreaterThan(0);
  expect(Number(await page.locator("#final-distance").textContent())).toBeGreaterThan(0);

  // テレメトリがサーバ（モック）へ POST されていること
  await expect.poll(() => posted.includes("run_end")).toBe(true);
  expect(posted).toContain("page_load");
  expect(posted).toContain("run_start");

  expect(errors, errors.join("\n")).toEqual([]);
});
