// /api クライアント。Phase 1 ではサーバ未接続のスタブ。
// テレメトリは DOM イベント "wr:telemetry" としても発火し、E2E テストが検証に使う。
// Phase 2 で fetch による POST を追加する（送信先は /api のみ。憲法第4条）。

export type TelemetryEvent = "page_load" | "run_start" | "run_end" | "js_error";

export interface TelemetryPayload {
  event: TelemetryEvent;
  version: string;
  ts: number;
  meta?: Record<string, number | string>;
}

export const APP_VERSION: string = __APP_VERSION__;

export function track(event: TelemetryEvent, meta?: Record<string, number | string>): void {
  const payload: TelemetryPayload = { event, version: APP_VERSION, ts: Date.now() };
  if (meta) payload.meta = meta;
  document.dispatchEvent(new CustomEvent<TelemetryPayload>("wr:telemetry", { detail: payload }));
}

export interface ApiResult<T = undefined> {
  ok: boolean;
  reason?: string;
  data?: T;
}

export type FeedbackCategory = "bug" | "balance" | "feature" | "other";

export async function submitFeedback(_category: FeedbackCategory, _body: string): Promise<ApiResult> {
  return { ok: false, reason: "not_connected" };
}

export async function startAdSession(): Promise<ApiResult<{ nonce: string }>> {
  return { ok: false, reason: "not_connected" };
}

export async function completeDevAd(_nonce: string): Promise<ApiResult<{ influence: number }>> {
  return { ok: false, reason: "not_connected" };
}

export interface BallotProposal {
  id: number;
  title: string;
  summary: string;
}

export async function fetchBallot(): Promise<ApiResult<BallotProposal[]>> {
  return { ok: false, reason: "not_connected" };
}

export async function submitVote(_proposalIds: number[]): Promise<ApiResult> {
  return { ok: false, reason: "not_connected" };
}

export async function fetchLatestReport(): Promise<ApiResult<{ week: number; body_md: string }>> {
  return { ok: false, reason: "not_connected" };
}
