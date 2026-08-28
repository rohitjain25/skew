import { beforeEach, describe, expect, it } from "vitest";
import { shiftUtcDate } from "./game/daily";
import type { RunSnapshot } from "./game/types";
import { cardStreakLine } from "./share";
import {
  STREAK_LAST,
  STREAK_MAX,
  STREAK_N,
  formatStatsLine,
  getDailySubmit,
  getLocalStats,
  nextStreakOnTodaySave,
  recordRun,
  resetStorageForTests,
  streakAsOf,
} from "./storage";

function dailySnap(date: string, extra: Partial<RunSnapshot> = {}): RunSnapshot {
  return {
    mode: "daily",
    score: 8421,
    roundIndex: 12,
    roundsHit: 12,
    lives: 3,
    combo: 4,
    seed: 1,
    date,
    ended: "complete",
    practice: false,
    ...extra,
  };
}

function at(dateId: string): Date {
  return new Date(`${dateId}T18:00:00Z`);
}

describe("UTC date shift", () => {
  it("crosses month ends", () => {
    expect(shiftUtcDate("2026-08-31", 1)).toBe("2026-09-01");
    expect(shiftUtcDate("2026-09-01", -1)).toBe("2026-08-31");
  });
});

describe("streak rules", () => {
  beforeEach(() => {
    resetStorageForTests();
  });

  it("two consecutive UTC Daily first-saves are a 2-day streak on the card", () => {
    const a = recordRun(dailySnap("2026-08-27", { score: 1000 }), at("2026-08-27"));
    expect(a.submitted).toBe(true);
    expect(a.stats.streak).toBe(1);
    expect(cardStreakLine("daily", "2026-08-27", a.stats.streak)).toBeNull();

    const b = recordRun(dailySnap("2026-08-28", { score: 1200 }), at("2026-08-28"));
    expect(b.submitted).toBe(true);
    expect(b.stats.streak).toBe(2);
    expect(b.stats.maxStreak).toBe(2);
    expect(b.stats.bestDaily).toBe(1200);
    expect(cardStreakLine("daily", "2026-08-28", b.stats.streak)).toBe("2-day streak");
    expect(formatStatsLine(b.stats)).toBe("2-day streak · Best streak 2 · Best daily 1,200");
  });

  it("skips a UTC day and resets", () => {
    recordRun(dailySnap("2026-08-27"), at("2026-08-27"));
    recordRun(dailySnap("2026-08-28"), at("2026-08-28"));
    expect(getLocalStats("2026-08-29").streak).toBe(2);
    expect(getLocalStats("2026-08-30").streak).toBe(0);

    const c = recordRun(dailySnap("2026-08-30", { score: 400 }), at("2026-08-30"));
    expect(c.stats.streak).toBe(1);
    expect(c.stats.maxStreak).toBe(2);
    expect(cardStreakLine("daily", "2026-08-30", c.stats.streak)).toBeNull();
  });

  it("practice, archive, and Endless do not increment", () => {
    recordRun(dailySnap("2026-08-27"), at("2026-08-27"));
    const practice = recordRun(
      dailySnap("2026-08-27", { practice: true, score: 99999 }),
      at("2026-08-27"),
    );
    expect(practice.submitted).toBe(false);
    expect(practice.stats.streak).toBe(1);

    const archive = recordRun(dailySnap("2026-08-20", { score: 50 }), at("2026-08-27"));
    expect(archive.submitted).toBe(true);
    expect(archive.stats.streak).toBe(1);

    const endless = recordRun(
      {
        mode: "endless",
        score: 500,
        roundIndex: 4,
        roundsHit: 3,
        lives: 0,
        combo: 0,
        seed: 2,
        ended: "lives",
      },
      at("2026-08-28"),
    );
    expect(endless.submitted).toBe(false);
    expect(getLocalStats("2026-08-28").streak).toBe(1);
  });

  it("keeps streak on localStorage keys only, not on the daily run payload", () => {
    recordRun(dailySnap("2026-08-27"), at("2026-08-27"));
    recordRun(dailySnap("2026-08-28"), at("2026-08-28"));
    const saved = getDailySubmit("2026-08-28");
    expect(saved).toMatchObject({ score: 8421, ended: "complete" });
    expect(saved).not.toHaveProperty("streak");
    expect(JSON.stringify(saved)).not.toMatch(/streak|upi|₹|poker/i);
    expect([STREAK_N, STREAK_MAX, STREAK_LAST]).toEqual([
      "skew.streak",
      "skew.streak.max",
      "skew.streak.last",
    ]);
  });
});

describe("streak math", () => {
  it("is idempotent on the same UTC day", () => {
    const a = nextStreakOnTodaySave(null, 0, "2026-08-27");
    const b = nextStreakOnTodaySave(a.last, a.n, "2026-08-27");
    expect(b).toEqual({ last: "2026-08-27", n: 1 });
  });

  it("zeros after a missed day", () => {
    expect(streakAsOf("2026-08-27", 4, "2026-08-29")).toBe(0);
    expect(streakAsOf("2026-08-27", 4, "2026-08-28")).toBe(4);
  });
});
