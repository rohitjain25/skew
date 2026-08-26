export type Mode = "endless" | "daily";

export type Family =
  | "card"
  | "circle"
  | "triangle"
  | "diamond"
  | "hexagon"
  | "star"
  | "plus"
  | "ring"
  | "capsule"
  | "chevron"
  | "arc"
  | "bars"
  | "dots"
  | "slash"
  | "frame"
  | "pentagon";

export type DiffType =
  | "hue"
  | "saturation"
  | "scale"
  | "rotation"
  | "stroke"
  | "micro-detail"
  | "offset"
  | "count"
  | "mirror";

export interface ShapeParams {
  family: Family;
  fillH: number;
  fillS: number;
  fillL: number;
  strokeOn: boolean;
  strokeW: number;
  rotation: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  mirror: boolean;
  count: number;
  micro: boolean;
  microSize: number;
}

export interface Round {
  family: Family;
  diffType: DiffType;
  oddIndex: 0 | 1 | 2;
  items: [ShapeParams, ShapeParams, ShapeParams];
  durationMs: number;
}

export interface RunSnapshot {
  mode: Mode;
  score: number;
  roundIndex: number;
  roundsHit: number;
  lives: number;
  combo: number;
  seed: number;
  date?: string;
  ended: "lives" | "complete";
  practice?: boolean;
}
