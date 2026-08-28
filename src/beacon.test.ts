import { describe, expect, it } from "vitest";
import { beaconBody } from "./beacon";
import {
  SHARE_CAP,
  applyPlay,
  applyShare,
  dayMetrics,
  emptyDay,
  isBeaconDay,
  isBeaconSid,
  parseBeaconBody,
  parseStored,
} from "./beacon/logic";

describe("beacon protocol", () => {
  it("accepts UUID sids and UTC dates only", () => {
    expect(isBeaconSid("2c1c2a4e-4d3a-4b8f-9c1d-7a6b5c4d3e2f")).toBe(true);
    expect(isBeaconSid("Rohit")).toBe(false);
    expect(isBeaconSid("127.0.0.1")).toBe(false);
    expect(isBeaconDay("2026-08-27")).toBe(true);
    expect(isBeaconDay("2026-02-31")).toBe(false);
  });

  it("one play per sid per day", () => {
    const sid = "2c1c2a4e-4d3a-4b8f-9c1d-7a6b5c4d3e2f";
    const a = applyPlay(emptyDay(), sid);
    const b = applyPlay(a, sid);
    expect(a.plays).toEqual([sid]);
    expect(b.plays).toEqual([sid]);
    expect(dayMetrics("2026-08-27", b)).toEqual({
      day: "2026-08-27",
      unique_players: 1,
      shares: 0,
      k: 0,
    });
  });

  it("caps shares at 20 per sid and computes k", () => {
    const sid = "2c1c2a4e-4d3a-4b8f-9c1d-7a6b5c4d3e2f";
    let state = applyPlay(emptyDay(), sid);
    for (let i = 0; i < 30; i++) state = applyShare(state, sid);
    expect(state.shareBySid[sid]).toBe(SHARE_CAP);
    const m = dayMetrics("2026-08-27", state);
    expect(m.shares).toBe(20);
    expect(m.unique_players).toBe(1);
    expect(m.k).toBe(20);
  });

  it("k is 0 when nobody played", () => {
    const sid = "2c1c2a4e-4d3a-4b8f-9c1d-7a6b5c4d3e2f";
    const state = applyShare(emptyDay(), sid);
    expect(dayMetrics("2026-08-27", state)).toEqual({
      day: "2026-08-27",
      unique_players: 0,
      shares: 1,
      k: 0,
    });
  });

  it("rejects bodies with PII-shaped sids or extra event types", () => {
    expect(parseBeaconBody({ d: "2026-08-27", sid: "phone-999", e: "play" })).toBeNull();
    expect(parseBeaconBody({ d: "2026-08-27", sid: "2c1c2a4e-4d3a-4b8f-9c1d-7a6b5c4d3e2f", e: "odd" })).toBeNull();
    expect(
      parseBeaconBody({
        d: "2026-08-27",
        sid: "2c1c2a4e-4d3a-4b8f-9c1d-7a6b5c4d3e2f",
        e: "play",
      }),
    ).toEqual({
      d: "2026-08-27",
      sid: "2c1c2a4e-4d3a-4b8f-9c1d-7a6b5c4d3e2f",
      e: "play",
    });
  });

  it("round-trips stored JSON without extra fields", () => {
    const sid = "2c1c2a4e-4d3a-4b8f-9c1d-7a6b5c4d3e2f";
    const raw = JSON.stringify({ plays: [sid], shareBySid: { [sid]: 2 }, ip: "1.1.1.1" });
    const state = parseStored(raw);
    expect(state).toEqual({ plays: [sid], shareBySid: { [sid]: 2 } });
    const m = dayMetrics("2026-08-27", state);
    expect(Object.keys(m).sort()).toEqual(["day", "k", "shares", "unique_players"]);
  });

  it("never sends streak on /api/p", () => {
    const body = beaconBody("2026-08-27", "2c1c2a4e-4d3a-4b8f-9c1d-7a6b5c4d3e2f", "play");
    expect(Object.keys(body).sort()).toEqual(["d", "e", "sid"]);
    expect(body).not.toHaveProperty("streak");
    expect(JSON.stringify(body)).not.toMatch(/streak/);
    expect(
      parseBeaconBody({
        d: "2026-08-27",
        sid: "2c1c2a4e-4d3a-4b8f-9c1d-7a6b5c4d3e2f",
        e: "play",
        streak: 9,
      }),
    ).toEqual({
      d: "2026-08-27",
      sid: "2c1c2a4e-4d3a-4b8f-9c1d-7a6b5c4d3e2f",
      e: "play",
    });
  });
});
