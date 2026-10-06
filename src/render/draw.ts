// Canvas 描画。state と params と theme を読むだけで、state を変更しない。

import { distanceMeters } from "../core/step";
import type { Params, State } from "../core/types";
import { drawShapes, type Theme } from "./shapes";

export interface HudStrings {
  distanceLabel: string;
  bestLabel: string;
  meterUnit: string;
}

export interface DrawContext {
  ctx: CanvasRenderingContext2D;
  params: Params;
  theme: Theme;
  hud: HudStrings;
  best: number;
}

export function draw(d: DrawContext, state: State): void {
  const { ctx, params, theme } = d;
  const p = params.physics;
  const W = p.world.width;
  const H = p.world.height;
  const pal = theme.palette;

  // 背景
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, W, H);

  // 地面と、進行を感じさせる縞（state.distance から決定的に算出）
  ctx.fillStyle = pal.ground;
  ctx.fillRect(0, p.groundY, W, H - p.groundY);
  ctx.fillStyle = pal.groundLine;
  const stripeGap = 48;
  const offset = state.distance % stripeGap;
  for (let x = -offset; x < W; x += stripeGap) {
    ctx.fillRect(x, p.groundY + 6, 24, 3);
  }
  ctx.fillRect(0, p.groundY, W, 2);

  // 障害物
  for (const o of state.obstacles) {
    const type = params.obstacles.types[o.typeIndex];
    const shapes = type ? theme.shapes.obstacles[type.id] : undefined;
    const box = { x: o.x, y: p.groundY - o.height - o.yOffset, w: o.width, h: o.height };
    if (shapes) {
      drawShapes(ctx, shapes, box, pal);
    } else {
      ctx.fillStyle = pal.obstacle;
      ctx.fillRect(box.x, box.y, box.w, box.h);
    }
  }

  // プレイヤー
  drawShapes(
    ctx,
    theme.shapes.player,
    { x: p.player.x, y: state.player.y, w: p.player.width, h: p.player.height },
    pal
  );

  // HUD
  ctx.fillStyle = pal.text;
  ctx.font = "bold 14px system-ui, sans-serif";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText(`${d.hud.distanceLabel} ${distanceMeters(state, params)}${d.hud.meterUnit}`, 10, 10);
  ctx.textAlign = "right";
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText(`${d.hud.bestLabel} ${d.best}${d.hud.meterUnit}`, W - 10, 12);
}
