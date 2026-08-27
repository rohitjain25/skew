import { describe, expect, it } from "vitest";
import { SITE_URL } from "../config";
import { generateDaily } from "./generator";
import { dailyDateFromSearch, hasDailyParam, isUtcDateId } from "./daily";
import { DAILY_SEED_VERSION } from "../config";
import { dailySeed } from "./rng";
import { challengeText } from "../share";

describe("?d= daily date", () => {
  it("accepts a valid UTC calendar date", () => {
    expect(isUtcDateId("2026-08-27")).toBe(true);
    expect(isUtcDateId("2026-02-31")).toBe(false);
    expect(isUtcDateId("nope")).toBe(false);
  });

  it("uses ?d= when present and UTC today when missing", () => {
    const now = new Date("2026-08-27T18:40:00Z");
    expect(dailyDateFromSearch("?d=2026-08-27", now)).toBe("2026-08-27");
    expect(dailyDateFromSearch("", now)).toBe("2026-08-27");
    expect(dailyDateFromSearch("?d=bad", now)).toBe("2026-08-27");
    expect(hasDailyParam("?d=2026-08-27")).toBe(true);
    expect(hasDailyParam("")).toBe(false);
  });

  it("2026-08-27 replays the same three shapes for every player", () => {
    const a = generateDaily("2026-08-27");
    const b = generateDaily("2026-08-27");
    expect(dailySeed("2026-08-27", DAILY_SEED_VERSION)).toBe(
      dailySeed("2026-08-27", DAILY_SEED_VERSION),
    );
    expect(a[0]?.items).toEqual(b[0]?.items);
    expect(a[0]?.oddIndex).toBe(b[0]?.oddIndex);
    expect(a).toEqual(b);
  });
});

describe("share text", () => {
  it("includes live origin and ?d= date", () => {
    const text = challengeText(8421, "http://127.0.0.1:43123", "2026-08-27");
    expect(text).toContain("https://temporary-zippy-mistral-mg92d6h.vercel.app/?d=2026-08-27");
    expect(SITE_URL).toBe("https://temporary-zippy-mistral-mg92d6h.vercel.app");
    expect(text).not.toMatch(/₹|poker|chip/i);
  });
});
