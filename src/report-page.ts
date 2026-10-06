// 週報の単独ページ（/report.html）。最新週報をプレーンテキストで表示し、締切済みの前回結果も併記する。
import { fetchLatestReport, fetchResultsLatest } from "./api";
import { renderResults } from "./ui/ballot";
import strings from "../params/strings.json";

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} not found`);
  return el;
}

$("title").textContent = strings.reportPageTitle;
$("back").textContent = strings.backToGame;

void fetchLatestReport().then((r) => {
  $("report").textContent = r.ok && r.data ? r.data.body_md : strings.reportEmpty;
});
void fetchResultsLatest().then((r) => {
  if (r.ok && r.data) $("results").append(renderResults(strings, r.data));
});
