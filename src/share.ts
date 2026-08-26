import { SHARE_DOMAIN_LOCKUP } from "./config";
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
}

export function challengeText(score: number, origin: string): string {
  const url = origin.replace(/\/$/, "");
  return `SKEW — Find the fake. I scored ${formatScore(score)}. Can you beat me?${url ? `\n${url}` : ""}`;
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

  const cy = 320;
  const size = 44;
  const gap = 28;
  const total = size * 3 + gap * 2;
  const x0 = (w - total) / 2;
  ctx.fillStyle = TEXT;
  rounded(ctx, x0, cy, size, size, 8);
  ctx.fill();
  ctx.save();
  ctx.translate(x0 + size + gap + size / 2, cy + size / 2);
  ctx.rotate((45 * Math.PI) / 180);
  rounded(ctx, -size / 2, -size / 2, size, size, 8);
  ctx.fill();
  ctx.restore();
  rounded(ctx, x0 + (size + gap) * 2, cy, size, size, 8);
  ctx.fill();

  setTracking(ctx, "0px");
  ctx.font = "800 140px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = TEXT;
  ctx.fillText(formatScore(input.score), w / 2, 620);

  ctx.font = "500 36px ui-monospace, SFMono-Regular, Menlo, monospace";
  const stats = input.newBest ? `${input.roundLabel}  ·  New best` : input.roundLabel;
  ctx.fillText(stats, w / 2, 700);

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
}): Promise<"shared" | "downloaded" | "copied"> {
  const blob = await renderScoreCard(opts);
  const file = new File([blob], "skew-score.png", { type: "image/png" });
  const text = challengeText(opts.score, location.origin);
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
