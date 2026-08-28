import { utcDateId } from "./game/rng";
import { isBeaconSid } from "./beacon/logic";

const SID_KEY = "skew.sid";

function ensureSid(): string | null {
  try {
    const existing = localStorage.getItem(SID_KEY);
    if (existing && isBeaconSid(existing)) return existing;
    const sid = crypto.randomUUID();
    localStorage.setItem(SID_KEY, sid);
    return sid;
  } catch {
    return null;
  }
}

/** Play/share ping only. Never includes streak, scores, or answers. */
export function beaconBody(
  d: string,
  sid: string,
  e: "play" | "share",
): { d: string; sid: string; e: "play" | "share" } {
  return { d, sid, e };
}

/** Fire-and-forget. Never throws into the game. */
export function fireBeacon(e: "play" | "share"): void {
  try {
    const sid = ensureSid();
    if (!sid) return;
    const body = JSON.stringify(beaconBody(utcDateId(), sid, e));
    void fetch("/api/p", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      /* fail open */
    });
  } catch {
    /* fail open */
  }
}
