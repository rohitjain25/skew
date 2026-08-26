export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** 0 = obvious, 1 = tiny. First rounds stay readable; later ones tighten. */
export function difficultyT(roundIndex: number): number {
  if (roundIndex <= 3) return roundIndex * 0.07;
  return Math.min(1, 0.28 + (1 - Math.exp(-(roundIndex - 3) / 11)) * 0.72);
}

export function roundDurationMs(roundIndex: number): number {
  const t = Math.min(1, roundIndex / 16);
  return Math.round(lerp(7200, 2400, t));
}

/**
 * combo is the streak after this hit (1 on first hit).
 * Multiplier 1.0, 1.2, 1.4 … capped at 3.0.
 */
export function comboMultiplier(combo: number): number {
  const n = Math.max(1, combo);
  return 1 + Math.min(n - 1, 10) * 0.2;
}

export function scoreHit(opts: {
  roundIndex: number;
  remainingMs: number;
  durationMs: number;
  combo: number;
}): number {
  const base = 100 + opts.roundIndex * 40;
  const frac = opts.durationMs <= 0 ? 0 : Math.max(0, Math.min(1, opts.remainingMs / opts.durationMs));
  const timeBonus = Math.round(frac * (50 + opts.roundIndex * 8));
  return Math.round((base + timeBonus) * comboMultiplier(opts.combo));
}

export function scoreMiss(): number {
  return 0;
}

export function formatScore(n: number): string {
  return Math.max(0, Math.round(n)).toLocaleString("en-US");
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  const s = total % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
