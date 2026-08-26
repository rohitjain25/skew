import { DAILY_ROUNDS } from "./config";
import type { Mode, RunSnapshot } from "./game/types";
import { utcDateId } from "./game/rng";

const ENDLESS_BEST = "skew.pb.endless";
const DAILY_BEST_PREFIX = "skew.pb.daily.";
const DAILY_RUN_PREFIX = "skew.run.daily.";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

export function getEndlessBest(): number {
  const v = Number(read(ENDLESS_BEST) ?? 0);
  return Number.isFinite(v) ? v : 0;
}

export function setEndlessBest(score: number): number {
  const next = Math.max(getEndlessBest(), score);
  write(ENDLESS_BEST, String(next));
  return next;
}

export function getDailyBest(dateId = utcDateId()): number {
  const v = Number(read(DAILY_BEST_PREFIX + dateId) ?? 0);
  return Number.isFinite(v) ? v : 0;
}

export interface DailySubmit {
  score: number;
  roundIndex: number;
  roundsHit: number;
  ended: RunSnapshot["ended"];
  at: string;
}

export function getDailySubmit(dateId = utcDateId()): DailySubmit | null {
  const raw = read(DAILY_RUN_PREFIX + dateId);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DailySubmit;
  } catch {
    return null;
  }
}

export function recordRun(snap: RunSnapshot): { best: number; newBest: boolean; submitted: boolean } {
  if (snap.mode === "endless") {
    const prev = getEndlessBest();
    const best = setEndlessBest(snap.score);
    return { best, newBest: snap.score > prev, submitted: false };
  }
  const dateId = snap.date ?? utcDateId();
  const prevBest = getDailyBest(dateId);
  const best = Math.max(prevBest, snap.score);
  write(DAILY_BEST_PREFIX + dateId, String(best));
  let submitted = false;
  if (!snap.practice && !getDailySubmit(dateId)) {
    const payload: DailySubmit = {
      score: snap.score,
      roundIndex: snap.roundIndex,
      roundsHit: snap.roundsHit,
      ended: snap.ended,
      at: new Date().toISOString(),
    };
    write(DAILY_RUN_PREFIX + dateId, JSON.stringify(payload));
    submitted = true;
  }
  return { best, newBest: snap.score > prevBest, submitted };
}

export function bestFor(mode: Mode, dateId = utcDateId()): number {
  return mode === "endless" ? getEndlessBest() : getDailyBest(dateId);
}

export function dailyProgressLabel(submit: DailySubmit | null): string {
  if (!submit) return `${DAILY_ROUNDS} rounds`;
  return `Today ${formatStored(submit.score)}`;
}

function formatStored(n: number): string {
  return n.toLocaleString("en-US");
}
