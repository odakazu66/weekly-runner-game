// 広告視聴フロー（dev ダミー）。15 秒カウントダウン → 完了 → サーバで記帳（Phase 2 で接続）。
// 本番ネットワークは環境フラグでアダプタ差替え（Phase 2 以降）。

import { completeDevAd, startAdSession } from "../api";
import { note, openPanel } from "./panel";

export interface AdStrings {
  watchAd: string;
  close: string;
  adCountdown: string;
  adDone: string;
  notConnected: string;
}

export const AD_SECONDS = 15;

export function openAd(s: AdStrings): void {
  const { body } = openPanel(s.watchAd, s.close);
  const counter = document.createElement("p");
  counter.className = "ad-counter";
  const status = note("");
  body.append(counter, status);

  let remaining = AD_SECONDS;
  counter.textContent = `${s.adCountdown} ${remaining}`;

  void startAdSession().then((session) => {
    const timer = window.setInterval(() => {
      remaining -= 1;
      counter.textContent = `${s.adCountdown} ${remaining}`;
      if (remaining <= 0) {
        window.clearInterval(timer);
        counter.textContent = s.adDone;
        if (!session.ok || !session.data) {
          status.textContent = s.notConnected;
          return;
        }
        void completeDevAd(session.data.nonce).then((r) => {
          status.textContent = r.ok && r.data ? `+1 (${r.data.influence})` : s.notConnected;
        });
      }
    }, 1000);
  });
}
