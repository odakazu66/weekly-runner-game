// 投票 UI の活性/非活性は「サーバの判定」に従う。サーバ応答をモックして両状態を検証する。
import { expect, test, type Page } from "@playwright/test";

const BALLOT_OPEN = {
  open: true, week: 40, server_time: 1760036400, opens_at: 1760036400, closes_at: 1760209200,
  proposals: [
    { id: 1, title: "ジャンプを高く", summary: "jumpVelocity を上げる", category: "balance", tier_estimate: 1 },
    { id: 2, title: "新障害物", summary: "動く障害物", category: "feature", tier_estimate: 2 },
    { id: 3, title: "色を明るく", summary: "palette 変更", category: "other", tier_estimate: 0 },
    { id: 4, title: "音を追加", summary: "効果音", category: "feature", tier_estimate: 2 },
  ],
};
const BALLOT_CLOSED = { ...BALLOT_OPEN, open: false, server_time: 1759800000, proposals: [] };
const RESULTS = {
  week: 39, closed_at: 1759604400, voters: 3, fallback_to_author_influence: true,
  ranked: [
    { id: 9, title: "前週の勝者", summary: "s", category: "balance", tier_estimate: 1, score: 12, vote_score: 12, support_score: 5, voters: 2, status: "implemented" },
    { id: 8, title: "次点", summary: "s", category: "other", tier_estimate: 0, score: 3, vote_score: 3, support_score: 1, voters: 1, status: "on_ballot" },
  ],
  rejected: [{ id: 7, title: "外部サイトへ", reason: "第2条: 外部サイトへの誘導" }],
};

async function mockApi(page: Page, ballot: object, onVote?: (ids: number[]) => void): Promise<void> {
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const json = (status: number, body: unknown) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (path === "/api/user") return json(201, { uuid: "e2e-0000-uuid" });
    if (path === "/api/telemetry") return route.fulfill({ status: 204, body: "" });
    if (path === "/api/ballot") return json(200, ballot);
    if (path === "/api/results/latest") return json(200, RESULTS);
    if (path === "/api/vote") {
      const body = JSON.parse(req.postData() ?? "{}") as { proposal_ids: number[] };
      onVote?.(body.proposal_ids);
      return json(200, { week: 40, weight: 5, accepted: body.proposal_ids });
    }
    return json(404, { detail: "mock" });
  });
}

async function dieQuickly(page: Page): Promise<void> {
  await page.goto("/");
  await page.locator("#start").click();
  await expect(page.locator("#gameover")).toBeVisible({ timeout: 30_000 }); // タップしなければ最初の障害物で死ぬ
}

test("投票期間中（サーバ判定 open）: ボタン活性、最大 3 件承認、投票送信", async ({ page }) => {
  const votes: number[][] = [];
  await mockApi(page, BALLOT_OPEN, (ids) => votes.push(ids));
  await dieQuickly(page);
  const btn = page.locator("#btn-vote");
  await expect(btn).toBeEnabled();
  await expect(btn).toHaveText("今週の投票");
  await btn.click();
  const boxes = page.locator(".ballot-list input[type=checkbox]");
  await expect(boxes).toHaveCount(4);
  await boxes.nth(0).check();
  await boxes.nth(1).check();
  await boxes.nth(2).check();
  await expect(boxes.nth(3)).toBeDisabled(); // 4 件目は選べない（上位 3 承認）
  await page.locator("#vote-submit").click();
  await expect(page.locator(".panel .note").last()).toHaveText(/OK \(weight 5\)/);
  expect(votes).toEqual([[1, 2, 3]]);
  // 投票用紙に得票は出ていない
  await expect(page.locator(".panel")).not.toContainText("得票");
});

test("投票期間外（サーバ判定 closed）: ボタン非活性、予定と前回結果を表示", async ({ page }) => {
  await mockApi(page, BALLOT_CLOSED);
  await dieQuickly(page);
  const btn = page.locator("#btn-vote");
  await expect(btn).toBeDisabled();
  await expect(btn).toHaveText("今週の投票（期間外）");
  // 非活性でも中身を確認するため、同じパネル描画を report ページ側ではなく直接呼ぶ代わりに、ボタンを一時的に有効化して開く
  await btn.evaluate((b) => ((b as HTMLButtonElement).disabled = false));
  await btn.click();
  const panel = page.locator(".panel");
  await expect(panel).toContainText("投票は金曜 03:00 〜 日曜 03:00");
  await expect(panel).toContainText("次回の投票:");
  await expect(panel).toContainText("前回の投票結果（第39週）");
  await expect(panel).toContainText("前週の勝者 ✅ — 得票 12（投票者 2） / 著者影響力 5");
  await expect(panel).toContainText("投票者が 10 人未満");
  await expect(panel).toContainText("外部サイトへ — 第2条");
});

test("週報ページ: 最新週報と前回結果を表示", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (status: number, body: unknown) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (path === "/api/report/latest") return json(200, { week: 39, body_md: "# 週刊ランナー 週報 第39週\n\n**結果**: 採択提案を実装し、配信しました。", published_at: 1 });
    if (path === "/api/results/latest") return json(200, RESULTS);
    return json(404, { detail: "mock" });
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("/report.html");
  await expect(page.locator("#title")).toHaveText("週刊ランナー 週報");
  await expect(page.locator("#report")).toContainText("第39週");
  await expect(page.locator("#results")).toContainText("前週の勝者");
  expect(errors).toEqual([]);
});
