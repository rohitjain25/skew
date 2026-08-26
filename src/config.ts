/** Optional tip rail (D-005). Empty string hides the results-screen line. */
const DEFAULT_TIP_UPI_URL =
  "upi://pay?pa=sarveshscientist1590-3@okicici&pn=SKEW&am=49&cu=INR";

const envTip = import.meta.env.VITE_TIP_UPI_URL as string | undefined;

export const TIP_UPI_URL =
  envTip !== undefined && envTip.length > 0 ? envTip : DEFAULT_TIP_UPI_URL;

export const TIP_VPA = "sarveshscientist1590-3@okicici";
export const TIP_PAYEE = "SKEW";
export const TIP_AMOUNT_LABEL = "₹49";

export const LIVES = 3;
export const DAILY_ROUNDS = 12;
export const DAILY_SEED_VERSION = "skew-daily-v1";

export const SHARE_DOMAIN_LOCKUP = "S K E W . G A M E";
