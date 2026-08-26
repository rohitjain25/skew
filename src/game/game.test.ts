import { describe, expect, it } from "vitest";
import { DAILY_ROUNDS, DAILY_SEED_VERSION } from "../config";
import { generateDaily, generateRun, isColorDiff } from "./generator";
import { dailySeed, hashString, RNG } from "./rng";
import { comboMultiplier, scoreHit, scoreMiss } from "./scoring";
import { Engine } from "./engine";

describe("daily seed", () => {
  it("is identical for the same UTC date on two 'devices'", () => {
    const a = dailySeed("2026-08-26", DAILY_SEED_VERSION);
    const b = dailySeed("2026-08-26", DAILY_SEED_VERSION);
    expect(a).toBe(b);
    expect(a).not.toBe(dailySeed("2026-08-27", DAILY_SEED_VERSION));
  });

  it("hash is stable", () => {
    expect(hashString("skew-daily-v1:2026-08-26")).toBe(hashString("skew-daily-v1:2026-08-26"));
  });

  it("generates the same 12 rounds for a date", () => {
    const a = generateDaily("2026-08-26");
    const b = generateDaily("2026-08-26");
    expect(a).toEqual(b);
    expect(a).toHaveLength(DAILY_ROUNDS);
    expect(generateDaily("2026-08-27")).not.toEqual(a);
  });
});

describe("round invariant", () => {
  it("exactly one odd item, and never all color-only across a run", () => {
    for (const seed of [1, 99, 20260826, 7, 123456789]) {
      const rounds = generateRun(seed, 24);
      let color = 0;
      for (const round of rounds) {
        const [x, y, z] = round.items;
        const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
        const matches = [eq(x, y), eq(y, z), eq(x, z)];
        const samePairs = matches.filter(Boolean).length;
        expect(samePairs).toBe(1);
        expect(eq(round.items[round.oddIndex], round.items[(round.oddIndex + 1) % 3])).toBe(false);
        if (isColorDiff(round.diffType)) color += 1;
      }
      expect(color).toBeLessThan(rounds.length);
      expect(color).toBeLessThanOrEqual(Math.ceil(rounds.length * 0.55));
    }
  });

  it("early rounds prefer structural diffs", () => {
    const first = generateRun(42, 3).map((r) => r.diffType);
    expect(first.every((d) => d !== "hue" && d !== "saturation")).toBe(true);
  });
});

describe("scoring", () => {
  it("miss is zero and hit scales with combo and round", () => {
    expect(scoreMiss()).toBe(0);
    const r0 = scoreHit({ roundIndex: 0, remainingMs: 5000, durationMs: 5000, combo: 1 });
    const r8 = scoreHit({ roundIndex: 8, remainingMs: 5000, durationMs: 5000, combo: 1 });
    const combo = scoreHit({ roundIndex: 8, remainingMs: 5000, durationMs: 5000, combo: 5 });
    expect(r8).toBeGreaterThan(r0);
    expect(combo).toBeGreaterThan(r8);
    expect(comboMultiplier(1)).toBe(1);
    expect(comboMultiplier(6)).toBe(2);
  });
});

describe("engine", () => {
  it("daily stream matches generateDaily", () => {
    const seed = dailySeed("2026-08-26", DAILY_SEED_VERSION);
    const expected = generateDaily("2026-08-26");
    const eng = new Engine({ mode: "daily", seed, date: "2026-08-26" });
    expect(eng.current).toEqual(expected[0]);
    eng.start(0);
    const hit = eng.tap(eng.current.oddIndex, 10);
    expect(hit?.verdict).toBe("hit");
    expect(hit?.points).toBeGreaterThan(0);
    eng.advance(20);
    expect(eng.current).toEqual(expected[1]);
  });

  it("miss costs a life and resets combo", () => {
    const eng = new Engine({ mode: "endless", seed: 1 });
    eng.start(0);
    const odd = eng.current.oddIndex;
    const wrong = (odd + 1) % 3;
    const r = eng.tap(wrong, 10);
    expect(r?.verdict).toBe("miss");
    expect(r?.points).toBe(0);
    expect(eng.lives).toBe(2);
    expect(eng.combo).toBe(0);
    expect(eng.score).toBe(0);
  });

  it("timeout is a miss", () => {
    const eng = new Engine({ mode: "endless", seed: 2 });
    eng.start(0);
    const r = eng.timeout(eng.current.durationMs + 1);
    expect(r?.verdict).toBe("timeout");
    expect(eng.lives).toBe(2);
  });
});

describe("RNG", () => {
  it("is deterministic", () => {
    const a = new RNG(123);
    const b = new RNG(123);
    const seqA = Array.from({ length: 20 }, () => a.float());
    const seqB = Array.from({ length: 20 }, () => b.float());
    expect(seqA).toEqual(seqB);
  });
});
