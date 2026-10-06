// theme.json の図形合成定義を解釈して Canvas に描く。
// 全座標は対象ボックスに対する相対値（0..1）。画像は一切扱わない。

export type PaletteKey = "bg" | "ground" | "groundLine" | "player" | "obstacle" | "accent" | "text";
export type Palette = Record<PaletteKey, string>;

export type Shape =
  | { kind: "rect"; x: number; y: number; w: number; h: number; color: PaletteKey }
  | { kind: "circle"; cx: number; cy: number; r: number; color: PaletteKey }
  | { kind: "triangle"; x1: number; y1: number; x2: number; y2: number; x3: number; y3: number; color: PaletteKey };

export interface Theme {
  palette: Palette;
  shapes: {
    player: Shape[];
    obstacles: Record<string, Shape[]>;
  };
}

export interface TargetBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function drawShapes(
  ctx: CanvasRenderingContext2D,
  shapes: readonly Shape[],
  box: TargetBox,
  palette: Palette
): void {
  for (const s of shapes) {
    ctx.fillStyle = palette[s.color];
    switch (s.kind) {
      case "rect":
        ctx.fillRect(box.x + s.x * box.w, box.y + s.y * box.h, s.w * box.w, s.h * box.h);
        break;
      case "circle": {
        const r = s.r * Math.min(box.w, box.h);
        ctx.beginPath();
        ctx.arc(box.x + s.cx * box.w, box.y + s.cy * box.h, r, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "triangle":
        ctx.beginPath();
        ctx.moveTo(box.x + s.x1 * box.w, box.y + s.y1 * box.h);
        ctx.lineTo(box.x + s.x2 * box.w, box.y + s.y2 * box.h);
        ctx.lineTo(box.x + s.x3 * box.w, box.y + s.y3 * box.h);
        ctx.closePath();
        ctx.fill();
        break;
    }
  }
}
