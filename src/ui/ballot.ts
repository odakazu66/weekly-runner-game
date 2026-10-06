// 投票 UI。金曜 03:00 〜 日曜 03:00 JST のみ活性（R3）。
// 期間判定は純関数 isBallotOpen(nowMs) に分離し、Phase 6 でサーバ時刻を注入できるようにする。

import { fetchBallot, submitVote } from "../api";
import { note, openPanel } from "./panel";

export interface BallotStrings {
  vote: string;
  close: string;
  submit: string;
  ballotClosed: string;
  ballotOpen: string;
  notConnected: string;
}

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
export const MAX_APPROVALS = 3;

/** JST で 金 03:00 <= t < 日 03:00 なら true。nowMs は UTC epoch ms。 */
export function isBallotOpen(nowMs: number): boolean {
  const jst = new Date(nowMs + JST_OFFSET_MS);
  const day = jst.getUTCDay(); // 0=日 ... 5=金 6=土
  const hour = jst.getUTCHours();
  if (day === 5) return hour >= 3;
  if (day === 6) return true;
  if (day === 0) return hour < 3;
  return false;
}

export function openBallot(s: BallotStrings, nowMs: number): void {
  const { body } = openPanel(s.vote, s.close);
  if (!isBallotOpen(nowMs)) {
    body.append(note(s.ballotClosed));
    return;
  }
  body.append(note(s.ballotOpen));
  const list = document.createElement("div");
  const status = note("");
  body.append(list, status);

  void fetchBallot().then((r) => {
    if (!r.ok || !r.data) {
      status.textContent = r.reason ?? s.notConnected;
      return;
    }
    if (!r.data.open) {
      status.textContent = s.ballotClosed;
      return;
    }
    const checks: HTMLInputElement[] = [];
    for (const p of r.data.proposals) {
      const label = document.createElement("label");
      label.className = "proposal";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = String(p.id);
      const text = document.createElement("span");
      text.textContent = `${p.title} — ${p.summary}`;
      label.append(cb, text);
      list.append(label);
      checks.push(cb);
    }
    const submit = document.createElement("button");
    submit.type = "button";
    submit.className = "btn";
    submit.textContent = s.submit;
    submit.addEventListener("click", () => {
      const ids = checks.filter((c) => c.checked).map((c) => Number(c.value)).slice(0, MAX_APPROVALS);
      void submitVote(ids).then((res) => {
        status.textContent = res.ok && res.data ? `OK (weight ${res.data.weight})` : (res.reason ?? s.notConnected);
      });
    });
    list.append(submit);
  });
}
