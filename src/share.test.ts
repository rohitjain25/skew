import { describe, expect, it } from "vitest";
import { DAILY_SEED_VERSION, SHARE_SIL_VERSION, SITE_URL } from "./config";
import { generateDaily } from "./game/generator";
import { dailySeed, hashString } from "./game/rng";
import {
  cardDateLine,
  cardMetaLine,
  cardStreakLine,
  challengeText,
  shareLockup,
  shareSilhouetteKey,
  shareSilhouettes,
} from "./share";

describe("share card", () => {
  it("lockup is the live host, not SKEW.GAME", () => {
    expect(shareLockup()).toBe("temporary-zippy-mistral-mg92d6h.vercel.app");
    expect(shareLockup()).toBe(new URL(SITE_URL).host);
    expect(shareLockup()).not.toMatch(/S\s*K\s*E\s*W\s*\.\s*G\s*A\s*M\s*E/i);
    expect(shareLockup()).not.toMatch(/₹|poker|chip/i);
  });

  it("share text keeps ?d= and has no rupee", () => {
    const text = challengeText(8421, "http://127.0.0.1:43123", "2026-08-27");
    expect(text).toContain("https://temporary-zippy-mistral-mg92d6h.vercel.app/?d=2026-08-27");
    expect(text).not.toMatch(/₹|poker|chip/i);
  });

  it("daily cards include the UTC date; endless does not", () => {
    expect(cardDateLine("daily", "2026-08-26")).toBe("2026-08-26 UTC");
    expect(cardDateLine("endless", "2026-08-26")).toBeNull();
    expect(cardMetaLine("Round 12", true)).toBe("Round 12  ·  New best");
    expect(cardMetaLine("Round 12", false)).toBe("Round 12");
  });

  it("shows N-day streak under the date only when streak is at least 2", () => {
    expect(cardStreakLine("daily", "2026-08-28", 2)).toBe("2-day streak");
    expect(cardStreakLine("daily", "2026-08-28", 1)).toBeNull();
    expect(cardStreakLine("daily", "2026-08-28", 0)).toBeNull();
    expect(cardStreakLine("endless", "2026-08-28", 5)).toBeNull();
    expect(cardStreakLine("daily", "2026-08-28", 2)).not.toMatch(/₹|poker|chip|upi/i);
  });

  it("silhouettes are hashed, stable, and not the daily puzzle seed", () => {
    const a = shareSilhouettes("daily", "2026-08-26");
    const b = shareSilhouettes("daily", "2026-08-26");
    expect(a).toEqual(b);
    expect(a).toHaveLength(3);
    expect(shareSilhouettes("daily", "2026-08-27")).not.toEqual(a);
    expect(hashString(`${SHARE_SIL_VERSION}:${shareSilhouetteKey("daily", "2026-08-26")}`)).not.toBe(
      dailySeed("2026-08-26", DAILY_SEED_VERSION),
    );
    const puzzleFamilies = generateDaily("2026-08-26").map((r) => r.family);
    expect(puzzleFamilies).not.toEqual(a);
  });
});
