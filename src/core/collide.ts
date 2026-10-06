// AABB（軸平行境界ボックス）衝突判定。辺が接しているだけ（重なり幅 0）は衝突とみなさない。

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function aabb(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** 当たり判定を inset 分だけ内側に縮めたボックスを返す（見た目より当たりを甘くするため） */
export function shrink(box: Box, inset: number): Box {
  const d = Math.min(inset, box.w / 2, box.h / 2);
  return { x: box.x + d, y: box.y + d, w: box.w - 2 * d, h: box.h - 2 * d };
}
