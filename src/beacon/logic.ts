/** Pure play/share day state. No PII, no IPs, no puzzle answers. */

export const SHARE_CAP = 20;

export type BeaconEvent = "play" | "share";

export interface DayState {
  plays: string[];
  shareBySid: Record<string, number>;
}

export interface DayMetrics {
  day: string;
  unique_players: number;
  shares: number;
  k: number;
}

const SID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function emptyDay(): DayState {
  return { plays: [], shareBySid: {} };
}

export function isBeaconSid(value: string): boolean {
  return SID_RE.test(value);
}

export function isBeaconDay(value: string): boolean {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export function parseBeaconBody(raw: unknown): { d: string; sid: string; e: BeaconEvent } | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;
  const d = body.d;
  const sid = body.sid;
  const e = body.e;
  if (typeof d !== "string" || !isBeaconDay(d)) return null;
  if (typeof sid !== "string" || !isBeaconSid(sid)) return null;
  if (e !== "play" && e !== "share") return null;
  return { d, sid, e };
}

export function applyPlay(state: DayState, sid: string): DayState {
  if (state.plays.includes(sid)) return state;
  return { plays: [...state.plays, sid], shareBySid: { ...state.shareBySid } };
}

export function applyShare(state: DayState, sid: string, cap = SHARE_CAP): DayState {
  const n = state.shareBySid[sid] ?? 0;
  if (n >= cap) return state;
  return {
    plays: [...state.plays],
    shareBySid: { ...state.shareBySid, [sid]: n + 1 },
  };
}

export function dayMetrics(day: string, state: DayState): DayMetrics {
  const unique_players = state.plays.length;
  let shares = 0;
  for (const n of Object.values(state.shareBySid)) shares += n;
  const k = unique_players === 0 ? 0 : shares / unique_players;
  return { day, unique_players, shares, k };
}

export function parseStored(raw: string | null): DayState {
  if (!raw) return emptyDay();
  try {
    const v = JSON.parse(raw) as Partial<DayState>;
    const plays = Array.isArray(v.plays) ? v.plays.filter((s) => typeof s === "string" && isBeaconSid(s)) : [];
    const shareBySid: Record<string, number> = {};
    if (v.shareBySid && typeof v.shareBySid === "object") {
      for (const [sid, n] of Object.entries(v.shareBySid)) {
        if (!isBeaconSid(sid) || typeof n !== "number" || n < 1) continue;
        shareBySid[sid] = Math.min(SHARE_CAP, Math.floor(n));
      }
    }
    return { plays: [...new Set(plays)], shareBySid };
  } catch {
    return emptyDay();
  }
}
