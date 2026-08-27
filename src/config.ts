export const LIVES = 3;
export const DAILY_ROUNDS = 12;
export const DAILY_SEED_VERSION = "skew-daily-v1";

/** Seed prefix for decorative share silhouettes. Not the daily puzzle seed. */
export const SHARE_SIL_VERSION = "skew-share-sil-v1";

export const SITE_URL = String(import.meta.env.VITE_SITE_URL ?? "").replace(/\/$/, "");
