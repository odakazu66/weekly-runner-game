// 投票 UI。活性/非活性は**サーバの判定**（/api/ballot の open）に従う（端末の時計は使わない）。
// 期間外は次回の予定と、締切済みの前回結果（/api/results/latest）を表示する。進行中の得票は表示しない。

import { fetchBallot, fetchResultsLatest, submitVote, type Ballot, type WeekResults } from "../api";
import { note, openPanel } from "./panel";

export interface BallotStrings {
  vote: string;
  close: string;
  submit: string;
  ballotClosed: string;
  ballotOpen: string;
  notConnected: string;
  ballotSchedule: string;
  lastResultsTitle: string;
  noResults: string;
  resultVotes: string;
  resultVoters: string;
  resultSupport: string;
  resultFallback: string;
  resultRejected: string;
}

export const MAX_APPROVALS = 3;

/** epoch 秒を JST の "M/D(曜) HH:MM" に整形（表示専用） */
export function formatJst(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000 + 9 * 3600 * 1000);
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${days[d.getUTCDay()]}) ${hh}:${mm}`;
}

export function scheduleText(s: BallotStrings, b: Ballot): string {
  return s.ballotSchedule.replace("{open}", formatJst(b.opens_at)).replace("{close}", formatJst(b.closes_at));
}

export function renderResults(s: BallotStrings, r: WeekResults): HTMLElement {
  const box = document.createElement("div");
  box.className = "results";
  const h = document.createElement("h3");
  h.textContent = `${s.lastResultsTitle}（第${r.week}週）`;
  box.append(h);
  if (r.fallback_to_author_influence) box.append(note(s.resultFallback));
  const list = document.createElement("ol");
  for (const p of r.ranked) {
    const li = document.createElement("li");
    const mark = p.status === "implemented" ? " ✅" : p.status === "failed" ? " ⚠️" : "";
    const support = r.fallback_to_author_influence ? ` / ${s.resultSupport} ${p.support_score}` : "";
    li.textContent = `${p.title}${mark} — ${s.resultVotes} ${p.vote_score}（${s.resultVoters} ${p.voters}）${support}`;
    list.append(li);
  }
  if (r.ranked.length === 0) list.append(Object.assign(document.createElement("li"), { textContent: s.noResults }));
  box.append(list);
  if (r.rejected.length) {
    const h2 = document.createElement("h4");
    h2.textContent = s.resultRejected;
    const ul = document.createElement("ul");
    for (const x of r.rejected) ul.append(Object.assign(document.createElement("li"), { textContent: `${x.title} — ${x.reason ?? ""}` }));
    box.append(h2, ul);
  }
  return box;
}

export function openBallot(s: BallotStrings): void {
  const { body } = openPanel(s.vote, s.close);
  const status = note("…");
  body.append(status);

  void fetchBallot().then((r) => {
    if (!r.ok || !r.data) {
      status.textContent = r.reason ?? s.notConnected;
      return;
    }
    const b = r.data;
    if (!b.open) {
      status.textContent = s.ballotClosed;
      body.append(note(scheduleText(s, b)));
      void fetchResultsLatest().then((res) => {
        body.append(res.ok && res.data ? renderResults(s, res.data) : note(s.noResults));
      });
      return;
    }
    status.textContent = s.ballotOpen;
    const list = document.createElement("div");
    list.className = "ballot-list";
    const checks: HTMLInputElement[] = [];
    for (const p of b.proposals) {
      const label = document.createElement("label");
      label.className = "proposal";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = String(p.id);
      cb.addEventListener("change", () => {
        const n = checks.filter((c) => c.checked).length;
        for (const c of checks) c.disabled = !c.checked && n >= MAX_APPROVALS;
      });
      const text = document.createElement("span");
      text.textContent = `${p.title} — ${p.summary}`;
      label.append(cb, text);
      list.append(label);
      checks.push(cb);
    }
    const submit = document.createElement("button");
    submit.type = "button";
    submit.className = "btn";
    submit.id = "vote-submit";
    submit.textContent = s.submit;
    const result = note("");
    submit.addEventListener("click", () => {
      const ids = checks.filter((c) => c.checked).map((c) => Number(c.value)).slice(0, MAX_APPROVALS);
      if (!ids.length) return;
      submit.disabled = true;
      void submitVote(ids).then((res) => {
        result.textContent = res.ok && res.data ? `OK (weight ${res.data.weight})` : (res.reason ?? s.notConnected);
        submit.disabled = false;
      });
    });
    body.append(list, submit, result);
  });
}
