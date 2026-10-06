// 意見送信フォーム。カテゴリ＋本文（500字まで）。送信先は Phase 2 で接続。

import { submitFeedback, type FeedbackCategory } from "../api";
import { note, openPanel } from "./panel";

export interface FeedbackStrings {
  sendFeedback: string;
  close: string;
  feedbackPlaceholder: string;
  feedbackCategories: Record<FeedbackCategory, string>;
  submit: string;
  notConnected: string;
}

const MAX_LEN = 500;

export function openFeedback(s: FeedbackStrings): void {
  const { body } = openPanel(s.sendFeedback, s.close);

  const select = document.createElement("select");
  for (const key of Object.keys(s.feedbackCategories) as FeedbackCategory[]) {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = s.feedbackCategories[key];
    select.append(opt);
  }
  const textarea = document.createElement("textarea");
  textarea.placeholder = s.feedbackPlaceholder;
  textarea.maxLength = MAX_LEN;
  textarea.rows = 5;

  const submit = document.createElement("button");
  submit.type = "button";
  submit.className = "btn";
  submit.textContent = s.submit;
  const status = note("");

  submit.addEventListener("click", () => {
    const text = textarea.value.trim();
    if (!text) return;
    submit.disabled = true;
    void submitFeedback(select.value as FeedbackCategory, text).then((r) => {
      status.textContent = r.ok ? "OK" : (r.reason ?? s.notConnected);
      if (r.ok) textarea.value = "";
      submit.disabled = false;
    });
  });

  body.append(select, textarea, submit, status);
}
