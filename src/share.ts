import { SHARE_DOMAIN_LOCKUP, SITE_URL } from "./config";
import { dailyPath } from "./game/daily";
import { formatScore } from "./game/scoring";
import type { Mode } from "./game/types";

const BG = "#0B0B0C";
const TEXT = "#F4F1EA";
const MUTED = "#8A8680";
const ACCENT = "#E8FF47";

export interface CardInput {
  score: number;
  roundLabel: string;
  newBest: boolean;
  mode: Mode;
  dateId: string;
}

export function challengeOrigin(fallbackOrigin: string): string {
  return (SITE_URL || fallbackOrigin).replace(/\/$/, "");
}

export function challengeText(score: number, origin: string, dateId: string): string {
  const link = `${challengeOrigin(origin)}${dailyPath(dateId)}`;
  return `SKEW — Find the fake. I scored ${formatScore(score)}. Can you beat me?\n${link}`;
}

export async function renderScoreCard(input: CardInput): Promise<Blob> {
  const w = 1080;
  const h = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = TEXT;
  ctx.font = "700 72px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  setTracking(ctx, "18px");
  ctx.fillText("SKEW", w / 2, 220);

  drawBrandBars(ctx, w / 2, 340);

  setTracking(ctx, "0px");
  ctx.font = "800 140px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = TEXT;
  ctx.fillText(formatScore(input.score), w / 2, 640);

  ctx.font = "500 36px ui-monospace, SFMono-Regular, Menlo, monospace";
  const stats = input.newBest ? `${input.roundLabel}  ·  New best` : input.roundLabel;
  ctx.fillText(stats, w / 2, 720);

  ctx.fillStyle = MUTED;
  ctx.font = "500 34px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("Can you beat me?", w / 2, 980);

  ctx.fillStyle = ACCENT;
  ctx.fillRect(w / 2 - 48, 1016, 96, 8);

  ctx.fillStyle = TEXT;
  ctx.font = "600 28px ui-sans-serif, system-ui, sans-serif";
  setTracking(ctx, "10px");
  ctx.fillText(SHARE_DOMAIN_LOCKUP, w / 2, 1180);

  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob"))), "image/png");
  });
}

/** Brand mark only: three upright bars, middle slightly skewed. No puzzles, rupee, or chips. */
function drawBrandBars(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  const barW = 28;
  const barH = 72;
  const gap = 22;
  const rx = 8;
  ctx.fillStyle = TEXT;
  const xs = [cx - barW * 1.5 - gap, cx - barW / 2, cx + barW / 2 + gap];
  xs.forEach((x, i) => {
    ctx.save();
    ctx.translate(x + barW / 2, cy);
    if (i === 1) ctx.rotate((-8 * Math.PI) / 180);
    rounded(ctx, -barW / 2, -barH / 2, barW, barH, rx);
    ctx.fill();
    ctx.restore();
  });
}

function setTracking(ctx: CanvasRenderingContext2D, value: string): void {
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = value;
}

function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export async function shareResult(opts: {
  score: number;
  roundLabel: string;
  newBest: boolean;
  mode: Mode;
  dateId: string;
}): Promise<"shared" | "downloaded" | "copied"> {
  const blob = await renderScoreCard(opts);
  const file = new File([blob], "skew-score.png", { type: "image/png" });
  const text = challengeText(opts.score, location.origin, opts.dateId);
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  if (nav.share) {
    try {
      const data: ShareData = { title: "SKEW", text, files: [file] };
      if (!nav.canShare || nav.canShare(data)) {
        await nav.share(data);
        return "shared";
      }
      await nav.share({ title: "SKEW", text });
      downloadBlob(blob, file.name);
      return "shared";
    } catch (err) {
      if ((err as DOMException).name === "AbortError") return "shared";
    }
  }
  downloadBlob(blob, file.name);
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "downloaded";
  }
}

function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function isUpiCapable(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
