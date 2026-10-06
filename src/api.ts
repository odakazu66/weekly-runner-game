// /api クライアント。送信先は同一オリジンの /api のみ（憲法第4条: 新規ネットワーク送信先の追加禁止）。
// 匿名 uuid は localStorage に保持し、X-WR-User ヘッダで送る。
// テレメトリは DOM イベント "wr:telemetry" としても発火し、E2E テストが検証に使う。

export type TelemetryEvent = "page_load" | "run_start" | "run_end" | "js_error";

export interface TelemetryPayload {
  event: TelemetryEvent;
  version: string;
  ts: number;
  meta?: Record<string, number | string>;
}

export const APP_VERSION: string = __APP_VERSION__;
const UUID_KEY = "wr:uuid";
const API = "/api";

export interface ApiResult<T = undefined> {
  ok: boolean;
  status?: number;
  reason?: string;
  data?: T;
}

let userPromise: Promise<string | null> | null = null;

function readStoredUuid(): string | null {
  try {
    return localStorage.getItem(UUID_KEY);
  } catch {
    return null;
  }
}

function storeUuid(v: string): void {
  try {
    localStorage.setItem(UUID_KEY, v);
  } catch {
    /* localStorage 不可なら毎回発行される（サーバ側レート制限あり） */
  }
}

/** 匿名ユーザー uuid を取得（なければサーバで発行）。失敗時 null。 */
export function ensureUser(): Promise<string | null> {
  if (userPromise) return userPromise;
  userPromise = (async () => {
    const stored = readStoredUuid();
    if (stored) return stored;
    const r = await request<{ uuid: string }>("POST", "/user", undefined, false);
    if (r.ok && r.data?.uuid) {
      storeUuid(r.data.uuid);
      return r.data.uuid;
    }
    userPromise = null;
    return null;
  })();
  return userPromise;
}

async function request<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  withUser = true
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (withUser) {
    const uid = await ensureUser();
    if (!uid) return { ok: false, reason: "no_user" };
    headers["x-wr-user"] = uid;
  }
  try {
    const res = await fetch(API + path, {
      method,
      headers,
      body: body === undefined ? null : JSON.stringify(body),
      keepalive: method === "POST",
    });
    let data: T | undefined;
    let reason: string | undefined;
    const text = await res.text();
    if (text) {
      try {
        const parsed = JSON.parse(text) as T & { detail?: unknown };
        if (res.ok) data = parsed;
        else reason = typeof parsed.detail === "string" ? parsed.detail : JSON.stringify(parsed.detail ?? parsed);
      } catch {
        reason = text.slice(0, 200);
      }
    }
    const result: ApiResult<T> = { ok: res.ok, status: res.status };
    if (data !== undefined) result.data = data;
    if (reason !== undefined) result.reason = reason;
    return result;
  } catch {
    return { ok: false, reason: "network" };
  }
}

export function track(event: TelemetryEvent, meta?: Record<string, number | string>): void {
  const payload: TelemetryPayload = { event, version: APP_VERSION, ts: Date.now() };
  if (meta) payload.meta = meta;
  document.dispatchEvent(new CustomEvent<TelemetryPayload>("wr:telemetry", { detail: payload }));
  void ensureUser().then((uid) => {
    if (!uid) return;
    // サーバは4イベントのみ受理。meta は送るが保存されない（データ最小化）。
    void request("POST", "/telemetry", { ...payload, uuid: uid }, false);
  });
}

export type FeedbackCategory = "bug" | "balance" | "feature" | "other";

export function submitFeedback(category: FeedbackCategory, body: string): Promise<ApiResult<{ id: number; week: number }>> {
  return request("POST", "/feedback", { category, body });
}

export function startAdSession(): Promise<ApiResult<{ nonce: string; expires_at: number; min_seconds: number }>> {
  return request("POST", "/ads/session");
}

export function completeDevAd(nonce: string): Promise<ApiResult<{ influence: number; week: number; daily_remaining: number }>> {
  return request("POST", "/ads/dev-complete", { nonce });
}

export function fetchInfluence(): Promise<ApiResult<{ influence: number; week: number; daily_remaining: number }>> {
  return request("GET", "/influence/me");
}

export interface BallotProposal {
  id: number;
  title: string;
  summary: string;
  category: string;
}

export interface Ballot {
  open: boolean;
  week: number;
  server_time: number;
  opens_at: number;
  closes_at: number;
  proposals: BallotProposal[];
}

export interface ResultRow {
  id: number;
  title: string;
  summary: string;
  category: string;
  tier_estimate: number;
  score: number;
  vote_score: number;
  support_score: number;
  voters: number;
  status: string;
}

export interface WeekResults {
  week: number;
  closed_at: number;
  voters: number;
  fallback_to_author_influence: boolean;
  ranked: ResultRow[];
  rejected: { id: number; title: string; reason: string | null }[];
}

export function fetchResultsLatest(): Promise<ApiResult<WeekResults>> {
  return request("GET", "/results/latest", undefined, false);
}

export function fetchBallot(): Promise<ApiResult<Ballot>> {
  return request("GET", "/ballot", undefined, false);
}

export function submitVote(proposalIds: number[]): Promise<ApiResult<{ week: number; weight: number; accepted: number[] }>> {
  return request("POST", "/vote", { proposal_ids: proposalIds });
}

export function fetchLatestReport(): Promise<ApiResult<{ week: number; body_md: string }>> {
  return request("GET", "/report/latest", undefined, false);
}
