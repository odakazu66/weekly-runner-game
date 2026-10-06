// ループ・入力・画面遷移。core（純関数）に tick と入力を渡し、render に state を渡すだけの薄い層。

import { track } from "./api";
import { createState, distanceMeters, step } from "./core/step";
import type { Input, Params, State } from "./core/types";
import { draw } from "./render/draw";
import type { Theme } from "./render/shapes";
import { openAd } from "./ui/ads";
import { openBallot } from "./ui/ballot";
import { openFeedback } from "./ui/feedback";
import { openReport } from "./ui/report";

import physics from "../params/physics.json";
import obstacles from "../params/obstacles.json";
import difficulty from "../params/difficulty.json";
import themeJson from "../params/theme.json";
import strings from "../params/strings.json";

const params: Params = { physics, obstacles, difficulty };
const theme = themeJson as Theme;

const TICK_MS = 1000 / 60;
const MAX_TICKS_PER_FRAME = 5;
const BEST_KEY = "wr:best";

type Screen = "title" | "playing" | "gameover";

function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} not found`);
  return el as T;
}

function applyStrings(): void {
  const dict = strings as Record<string, unknown>;
  document.querySelectorAll<HTMLElement>("[data-s]").forEach((el) => {
    const key = el.dataset["s"];
    const v = key ? dict[key] : undefined;
    if (typeof v === "string") el.textContent = v;
  });
}

function loadBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function saveBest(v: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(v));
  } catch {
    /* localStorage 不可の環境では無視 */
  }
}

function main(): void {
  applyStrings();

  const canvas = $<HTMLCanvasElement>("game");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  const W = params.physics.world.width;
  const H = params.physics.world.height;

  function resize(): void {
    const scale = Math.max(1, Math.floor(Math.min(window.innerWidth / W, window.innerHeight / H) * 2) / 2);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W * scale}px`;
    canvas.style.height = `${H * scale}px`;
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  let best = loadBest();
  let screen: Screen = "title";
  let state: State = createState(0, params);
  let pendingJump = false;
  let acc = 0;
  let last = performance.now();

  const titleEl = $("title");
  const overEl = $("gameover");
  const finalEl = $("final-distance");

  function show(s: Screen): void {
    screen = s;
    titleEl.hidden = s !== "title";
    overEl.hidden = s !== "gameover";
  }

  function startRun(): void {
    // シードは core の外で決める（core は Date/Math.random を参照しない）
    const seed = (Date.now() ^ (performance.now() * 1000)) >>> 0;
    state = createState(seed, params);
    pendingJump = false;
    acc = 0;
    last = performance.now();
    show("playing");
    track("run_start");
  }

  function endRun(): void {
    const m = distanceMeters(state, params);
    if (m > best) {
      best = m;
      saveBest(best);
    }
    finalEl.textContent = String(m);
    show("gameover");
    track("run_end", { distance: m });
  }

  function onTap(e: Event): void {
    if (screen !== "playing") return;
    e.preventDefault();
    pendingJump = true;
  }
  canvas.addEventListener("pointerdown", onTap);
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp") onTap(e);
  });

  $("start").addEventListener("click", startRun);
  $("retry").addEventListener("click", startRun);
  $("btn-feedback").addEventListener("click", () => openFeedback(strings));
  $("btn-ad").addEventListener("click", () => openAd(strings));
  $("btn-vote").addEventListener("click", () => openBallot(strings, Date.now()));
  $("btn-report").addEventListener("click", () => openReport(strings));

  const hud = { distanceLabel: strings.distanceLabel, bestLabel: strings.bestLabel, meterUnit: strings.meterUnit };

  function frame(now: number): void {
    if (screen === "playing") {
      acc += Math.min(now - last, TICK_MS * MAX_TICKS_PER_FRAME);
      last = now;
      while (acc >= TICK_MS && state.alive) {
        const input: Input = { jump: pendingJump };
        pendingJump = false;
        state = step(state, input, params);
        acc -= TICK_MS;
      }
      if (!state.alive) endRun();
    } else {
      last = now;
    }
    draw({ ctx: ctx!, params, theme, hud, best }, state);
    requestAnimationFrame(frame);
  }

  window.addEventListener("error", (e) => track("js_error", { message: String(e.message).slice(0, 200) }));
  window.addEventListener("unhandledrejection", (e) =>
    track("js_error", { message: String(e.reason).slice(0, 200) })
  );
  track("page_load");
  requestAnimationFrame(frame);
}

main();
