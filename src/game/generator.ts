import { DAILY_ROUNDS, DAILY_SEED_VERSION } from "../config";
import { dailySeed, RNG } from "./rng";
import { difficultyT, lerp, roundDurationMs } from "./scoring";
import type { DiffType, Family, Round, ShapeParams } from "./types";

const COLOR_DIFFS: ReadonlySet<DiffType> = new Set(["hue", "saturation"]);

const FAMILIES: readonly Family[] = [
  "card",
  "circle",
  "triangle",
  "diamond",
  "hexagon",
  "star",
  "plus",
  "ring",
  "capsule",
  "chevron",
  "arc",
  "bars",
  "dots",
  "slash",
  "frame",
  "pentagon",
];

const FAMILY_DIFFS: Record<Family, readonly DiffType[]> = {
  card: ["hue", "saturation", "scale", "rotation", "stroke", "micro-detail", "offset"],
  circle: ["hue", "saturation", "scale", "stroke", "micro-detail", "offset", "count"],
  triangle: ["hue", "saturation", "scale", "rotation", "stroke", "micro-detail", "offset", "mirror"],
  diamond: ["hue", "saturation", "scale", "rotation", "stroke", "micro-detail", "offset"],
  hexagon: ["hue", "saturation", "scale", "rotation", "stroke", "micro-detail", "offset"],
  star: ["hue", "saturation", "scale", "rotation", "stroke", "micro-detail", "offset"],
  plus: ["hue", "saturation", "scale", "rotation", "stroke", "micro-detail", "offset"],
  ring: ["hue", "saturation", "scale", "stroke", "micro-detail", "offset"],
  capsule: ["hue", "saturation", "scale", "rotation", "stroke", "micro-detail", "offset"],
  chevron: ["hue", "saturation", "scale", "rotation", "stroke", "offset", "mirror"],
  arc: ["hue", "saturation", "scale", "rotation", "stroke", "offset", "mirror"],
  bars: ["hue", "saturation", "scale", "rotation", "stroke", "offset", "count"],
  dots: ["hue", "saturation", "scale", "rotation", "offset", "count"],
  slash: ["hue", "saturation", "scale", "rotation", "stroke", "offset", "mirror"],
  frame: ["hue", "saturation", "scale", "rotation", "stroke", "micro-detail", "offset"],
  pentagon: ["hue", "saturation", "scale", "rotation", "stroke", "micro-detail", "offset"],
};

function cloneParams(p: ShapeParams): ShapeParams {
  return { ...p };
}

function pickDiff(
  rng: RNG,
  family: Family,
  roundIndex: number,
  recent: DiffType[],
): DiffType {
  let pool = [...FAMILY_DIFFS[family]];
  const lastTwoColor =
    recent.length >= 2 && recent.slice(-2).every((d) => COLOR_DIFFS.has(d));
  if (lastTwoColor) {
    pool = pool.filter((d) => !COLOR_DIFFS.has(d));
  }
  if (roundIndex < 5) {
    const structural = pool.filter((d) => !COLOR_DIFFS.has(d));
    if (structural.length) pool = structural;
  }
  if (roundIndex < 4) {
    const obvious = pool.filter((d) =>
      d === "rotation" || d === "scale" || d === "count" || d === "offset" || d === "mirror",
    );
    if (obvious.length) pool = obvious;
  }
  if (pool.length === 0) {
    pool = [...FAMILY_DIFFS[family]];
  }
  return rng.pick(pool);
}

function baseParams(rng: RNG, family: Family, t: number): ShapeParams {
  const chromatic = rng.chance(0.42);
  const fillH = rng.range(0, 360);
  const fillS = chromatic ? rng.range(38, 68) : rng.range(6, 16);
  const fillL = chromatic ? rng.range(58, 74) : rng.range(88, 94);
  const countBase =
    family === "dots" ? 4 + rng.int(2) : family === "bars" ? 3 + rng.int(2) : family === "circle" ? 3 + rng.int(2) : 3;
  return {
    family,
    fillH,
    fillS,
    fillL,
    strokeOn: family === "frame" || family === "ring" || rng.chance(0.28),
    strokeW: lerp(5.5, 2.2, t),
    rotation: family === "circle" || family === "ring" || t < 0.22 ? 0 : rng.range(-10, 10),
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    mirror: false,
    count: countBase,
    micro: false,
    microSize: lerp(9, 3.2, t),
  };
}

function applyDiff(
  rng: RNG,
  base: ShapeParams,
  diff: DiffType,
  t: number,
): ShapeParams {
  const odd = cloneParams(base);
  const sign = rng.sign();
  switch (diff) {
    case "hue":
      odd.fillH = (odd.fillH + sign * lerp(46, 7, t) + 360) % 360;
      break;
    case "saturation":
      odd.fillS = clamp(odd.fillS + sign * lerp(34, 8, t), 4, 90);
      break;
    case "scale":
      odd.scale = lerp(1.42, 1.055, t);
      break;
    case "rotation":
      odd.rotation += sign * lerp(34, 3.4, t);
      break;
    case "stroke":
      if (base.strokeOn) {
        odd.strokeW = Math.max(0.8, base.strokeW + sign * lerp(4.2, 1.15, t));
      } else {
        odd.strokeOn = true;
        odd.strokeW = lerp(6.5, 1.7, t);
      }
      break;
    case "micro-detail":
      odd.micro = true;
      odd.microSize = lerp(10, 3.1, t);
      break;
    case "offset": {
      const mag = lerp(20, 2.8, t);
      if (rng.chance(0.5)) odd.offsetX = sign * mag;
      else odd.offsetY = sign * mag;
      break;
    }
    case "count":
      odd.count = Math.max(1, base.count + (rng.chance(0.5) ? 1 : -1));
      if (odd.count === base.count) odd.count = base.count + 1;
      break;
    case "mirror":
      odd.mirror = !base.mirror;
      break;
    default: {
      const _exhaustive: never = diff;
      return _exhaustive;
    }
  }
  return odd;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function generateRound(
  rng: RNG,
  roundIndex: number,
  recent: DiffType[],
): Round {
  const t = difficultyT(roundIndex);
  let family = rng.pick(FAMILIES);
  if (roundIndex < 4) {
    family = rng.pick(["chevron", "slash", "bars", "triangle", "star", "card", "arc"]);
  }
  const diffType = pickDiff(rng, family, roundIndex, recent);
  const oddIndex = rng.int(3) as 0 | 1 | 2;
  const base = baseParams(rng, family, t);
  const odd = applyDiff(rng, base, diffType, t);
  const items: [ShapeParams, ShapeParams, ShapeParams] = [
    cloneParams(base),
    cloneParams(base),
    cloneParams(base),
  ];
  items[oddIndex] = odd;
  return {
    family,
    diffType,
    oddIndex,
    items,
    durationMs: roundDurationMs(roundIndex),
  };
}

export function generateRun(seed: number, count: number): Round[] {
  const rng = new RNG(seed);
  const recent: DiffType[] = [];
  const rounds: Round[] = [];
  for (let i = 0; i < count; i++) {
    const round = generateRound(rng, i, recent);
    recent.push(round.diffType);
    if (recent.length > 6) recent.shift();
    rounds.push(round);
  }
  return rounds;
}

export function generateDaily(dateId: string): Round[] {
  return generateRun(dailySeed(dateId, DAILY_SEED_VERSION), DAILY_ROUNDS);
}

export function isColorDiff(d: DiffType): boolean {
  return COLOR_DIFFS.has(d);
}
