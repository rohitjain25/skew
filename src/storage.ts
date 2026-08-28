import { DAILY_ROUNDS } from "./config";
import { shiftUtcDate } from "./game/daily";
import { utcDateId } from "./game/rng";
import { formatScore } from "./game/scoring";
import type { Mode, RunSnapshot } from "./game/types";

const ENDLESS_BEST = "skew.pb.endless";
const DAILY_BEST_PREFIX = "skew.pb.daily.";
const DAILY_RUN_PREFIX = "skew.run.daily.";
/** Current streak length as of `skew.streak.last`. Not sent to /api/p. */
export const STREAK_N = "skew.streak";
export const STREAK_MAX = "skew.streak.max";
export const STREAK_LAST = "skew.streak.last";

export interface Kv {
  get(key: string): string | null;
  set(key: string, value: string): void;
  keys(): string[];
}

function memoryKv(): Kv {
  const map = new Map<string, string>();
  return {
    get: (key) => map.get(key) ?? null,
    set: (key, value) => {
      map.set(key, value);
    },
    keys: () => [...map.keys()],
  };
}

function localKv(): Kv | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return {
      get: (key) => localStorage.getItem(key),
      set: (key, value) => {
        localStorage.setItem(key, value);
      },
      keys: () => {
        const out: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) out.push(k);
        }
        return out;
      },
    };
  } catch {
    return null;
  }
}

let kv: Kv = localKv() ?? memoryKv();

/** Test-only. Isolates localStorage-backed stats. */
export function resetStorageForTests(store?: Kv): void {
  kv = store ?? memoryKv();
}

function read(key: string): string | null {
  try {
    return kv.get(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    kv.set(key, value);
  } catch {
    /* private mode */
  }
}

function readInt(key: string, fallback = 0): number {
  const v = Number(read(key) ?? fallback);
  return Number.isFinite(v) ? v : fallback;
}

export function getEndlessBest(): number {
  return readInt(ENDLESS_BEST, 0);
}

export function setEndlessBest(score: number): number {
  const next = Math.max(getEndlessBest(), score);
  write(ENDLESS_BEST, String(next));
  return next;
}

export function getDailyBest(dateId = utcDateId()): number {
  return readInt(DAILY_BEST_PREFIX + dateId, 0);
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

export interface LocalStats {
  streak: number;
  maxStreak: number;
  bestDaily: number;
}

/**
 * Current streak as of `today`.
 * A missed UTC day (gap after `lastDate`) → 0. Today not yet played still
 * counts yesterday's run (the UTC day is not over).
 */
export function streakAsOf(lastDate: string | null, n: number, today: string): number {
  if (!lastDate || n <= 0) return 0;
  if (lastDate === today) return n;
  if (lastDate === shiftUtcDate(today, -1)) return n;
  return 0;
}

/** First UTC-today Daily save: +1 if yesterday counted, else 1. Idempotent same day. */
export function nextStreakOnTodaySave(
  lastDate: string | null,
  n: number,
  today: string,
): { last: string; n: number } {
  if (lastDate === today) return { last: today, n: Math.max(1, n) };
  if (lastDate === shiftUtcDate(today, -1)) return { last: today, n: Math.max(1, n) + 1 };
  return { last: today, n: 1 };
}

function applyTodayFirstSave(today: string): void {
  const last = read(STREAK_LAST);
  const n = readInt(STREAK_N, 0);
  const next = nextStreakOnTodaySave(last, n, today);
  const max = Math.max(readInt(STREAK_MAX, 0), next.n);
  write(STREAK_LAST, next.last);
  write(STREAK_N, String(next.n));
  write(STREAK_MAX, String(max));
}

export function getBestDaily(): number {
  let best = 0;
  try {
    for (const key of kv.keys()) {
      if (!key.startsWith(DAILY_BEST_PREFIX)) continue;
      const v = Number(read(key) ?? 0);
      if (Number.isFinite(v)) best = Math.max(best, v);
    }
  } catch {
    /* ignore */
  }
  return best;
}

export function getLocalStats(today = utcDateId()): LocalStats {
  const last = read(STREAK_LAST);
  const n = readInt(STREAK_N, 0);
  return {
    streak: streakAsOf(last, n, today),
    maxStreak: readInt(STREAK_MAX, 0),
    bestDaily: getBestDaily(),
  };
}

export function formatStatsLine(stats: LocalStats): string {
  return `${stats.streak}-day streak · Best streak ${stats.maxStreak} · Best daily ${formatScore(stats.bestDaily)}`;
}

export function recordRun(
  snap: RunSnapshot,
  now = new Date(),
): { best: number; newBest: boolean; submitted: boolean; stats: LocalStats } {
  const today = utcDateId(now);
  if (snap.mode === "endless") {
    const prev = getEndlessBest();
    const best = setEndlessBest(snap.score);
    return { best, newBest: snap.score > prev, submitted: false, stats: getLocalStats(today) };
  }
  const dateId = snap.date ?? today;
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
      at: now.toISOString(),
    };
    write(DAILY_RUN_PREFIX + dateId, JSON.stringify(payload));
    submitted = true;
    if (dateId === today) applyTodayFirstSave(today);
  }
  return { best, newBest: snap.score > prevBest, submitted, stats: getLocalStats(today) };
}

export function bestFor(mode: Mode, dateId = utcDateId()): number {
  return mode === "endless" ? getEndlessBest() : getDailyBest(dateId);
}

export function dailyProgressLabel(submit: DailySubmit | null): string {
  if (!submit) return `${DAILY_ROUNDS} rounds`;
  return `Today ${formatScore(submit.score)}`;
}
