// 週報表示。Markdown はプレーンテキストとして表示する（HTML 化しない＝XSS 面を作らない）。

import { fetchLatestReport } from "../api";
import { note, openPanel } from "./panel";

export interface ReportStrings {
  patchNotes: string;
  close: string;
  reportEmpty: string;
}

export function openReport(s: ReportStrings): void {
  const { body } = openPanel(s.patchNotes, s.close);
  const pre = document.createElement("pre");
  pre.className = "report";
  body.append(pre);
  void fetchLatestReport().then((r) => {
    if (!r.ok || !r.data) {
      body.replaceChildren(note(s.reportEmpty));
      return;
    }
    pre.textContent = r.data.body_md;
  });
}
