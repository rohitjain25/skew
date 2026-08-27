import { utcDateId } from "./rng";

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isUtcDateId(value: string): boolean {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === mo - 1 &&
    dt.getUTCDate() === d
  );
}

/** Use ?d=YYYY-MM-DD when valid; otherwise UTC today. Does not change the seed formula. */
export function dailyDateFromSearch(search: string, now = new Date()): string {
  const raw = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("d");
  if (raw && isUtcDateId(raw)) return raw;
  return utcDateId(now);
}

export function hasDailyParam(search: string): boolean {
  const raw = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("d");
  return Boolean(raw && isUtcDateId(raw));
}

export function dailyPath(dateId: string): string {
  return `/?d=${dateId}`;
}

export function syncDailyQuery(dateId: string): void {
  const url = new URL(location.href);
  url.searchParams.set("d", dateId);
  history.replaceState(null, "", `${url.pathname}?d=${dateId}`);
}
