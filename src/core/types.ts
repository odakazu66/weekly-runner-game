// State / Input / Params の型定義。params/*.json の構造は params/schema/*.schema.json と一致させる。

import type { RngState } from "./rng";

export interface PhysicsParams {
  world: { width: number; height: number };
  /** 1 tick あたりの落下加速度 (px/tick^2) */
  gravity: number;
  /** ジャンプ初速 (px/tick, 上向き正) */
  jumpVelocity: number;
  /** 落下速度上限 (px/tick) */
  maxFallSpeed: number;
  player: { x: number; width: number; height: number };
  /** 地面の上端 y 座標 */
  groundY: number;
  /** 当たり判定を内側に縮める量 (px) */
  hitboxInset: number;
  /** 距離スコア換算: 何 px で 1m か */
  pixelsPerMeter: number;
}

export interface ObstacleType {
  id: string;
  /** 出現重み（相対値） */
  weight: number;
  width: number;
  height: number;
  /** 地面からの浮き (px)。0 なら接地 */
  yOffset: number;
}

export interface ObstaclesParams {
  types: ObstacleType[];
  /** 連続する障害物の間隔 (px)。難易度 density で割られる */
  gap: { min: number; max: number };
  /** 最初の障害物が出るまでの猶予距離 (px) */
  firstSpawnDistance: number;
}

export interface DifficultyPoint {
  /** この距離 (px) 以降に適用。昇順 */
  distance: number;
  /** スクロール速度 (px/tick) */
  speed: number;
  /** 出現密度。gap をこの値で割る（1 = 既定、2 = 半分の間隔） */
  density: number;
}

export interface DifficultyParams {
  /** 距離→(速度, 密度) の折れ線。区間内は線形補間 */
  curve: DifficultyPoint[];
}

export interface Params {
  physics: PhysicsParams;
  obstacles: ObstaclesParams;
  difficulty: DifficultyParams;
}

export interface Input {
  /** この tick にタップ（ジャンプ要求）があったか */
  jump: boolean;
}

export interface Obstacle {
  /** params.obstacles.types の index */
  typeIndex: number;
  x: number;
  width: number;
  height: number;
  yOffset: number;
}

export interface PlayerState {
  y: number;
  vy: number;
  onGround: boolean;
}

export interface State {
  tick: number;
  rng: RngState;
  alive: boolean;
  /** 進んだ距離 (px) */
  distance: number;
  /** 直近 tick のスクロール速度 (px/tick) */
  speed: number;
  player: PlayerState;
  obstacles: Obstacle[];
  /** 次の障害物を出すまでの残り距離 (px) */
  nextSpawnIn: number;
}
