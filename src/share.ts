import { SHARE_SIL_VERSION, SITE_URL } from "./config";
import { dailyPath } from "./game/daily";
import { hashString, RNG } from "./game/rng";
import { formatScore } from "./game/scoring";
import type { Mode } from "./game/types";

const BG = "#0B0B0C";
const SURFACE = "#161618";
const TEXT = "#F4F1EA";
const MUTED = "#8A8680";
const ACCENT = "#E8FF47";

export const SHARE_SILS = [
  "circle",
  "triangle",
  "diamond",
  "bars",
  "slash",
  "chevron",
  "capsule",
  "plus",
] as const;

export type ShareSil = (typeof SHARE_SILS)[number];

export interface CardInput {
  score: number;
  roundLabel: string;
  newBest: boolean;
  mode: Mode;
  dateId: string;
}

/** Live host, e.g. temporary-zippy-mistral-mg92d6h.vercel.app — not SKEW.GAME. */
export function shareLockup(siteUrl = SITE_URL): string {
  const raw = siteUrl.replace(/\/$/, "");
  try {
    return new URL(raw).host;
  } catch {
    return raw.replace(/^https?:\/\//, "");
  }
}

export function challengeOrigin(fallbackOrigin: string): string {
  return (SITE_URL || fallbackOrigin).replace(/\/$/, "");
}

export function challengeText(score: number, origin: string, dateId: string): string {
  const link = `${challengeOrigin(origin)}${dailyPath(dateId)}`;
  return `SKEW — Find the fake. I scored ${formatScore(score)}. Can you beat me?\n${link}`;
}

export function shareSilhouetteKey(mode: Mode, dateId: string): string {
  return mode === "daily" ? `daily:${dateId}` : "endless";
}

/** Decorative trio from a share-only hash. Never the daily puzzle stream. */
export function shareSilhouettes(mode: Mode, dateId: string): [ShareSil, ShareSil, ShareSil] {
  const seed = hashString(`${SHARE_SIL_VERSION}:${shareSilhouetteKey(mode, dateId)}`);
  const rng = new RNG(seed);
  return [rng.pick(SHARE_SILS), rng.pick(SHARE_SILS), rng.pick(SHARE_SILS)];
}

export function cardDateLine(mode: Mode, dateId: string): string | null {
  if (mode !== "daily" || !dateId) return null;
  return `${dateId} UTC`;
}

export function cardMetaLine(roundLabel: string, newBest: boolean): string {
  return newBest ? `${roundLabel}  ·  New best` : roundLabel;
}

export function silhouetteSvg(kind: ShareSil): string {
  const fill = TEXT;
  switch (kind) {
    case "circle":
      return `<circle r="22" fill="${fill}" />`;
    case "triangle":
      return `<polygon points="0,-24 22,20 -22,20" fill="${fill}" />`;
    case "diamond":
      return `<polygon points="0,-24 20,0 0,24 -20,0" fill="${fill}" />`;
    case "bars":
      return `<rect x="-18" y="-20" width="8" height="40" rx="3" fill="${fill}" /><rect x="-4" y="-20" width="8" height="40" rx="3" fill="${fill}" /><rect x="10" y="-20" width="8" height="40" rx="3" fill="${fill}" />`;
    case "slash":
      return `<path d="M-16,18 L16,-18" fill="none" stroke="${fill}" stroke-width="8" stroke-linecap="round" />`;
    case "chevron":
      return `<path d="M-16,-16 L14,0 L-16,16" fill="none" stroke="${fill}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />`;
    case "capsule":
      return `<rect x="-10" y="-22" width="20" height="44" rx="10" fill="${fill}" />`;
    case "plus":
      return `<path d="M-7,-22 H7 V-7 H22 V7 H7 V22 H-7 V7 H-22 V-7 H-7 Z" fill="${fill}" />`;
    default: {
      const _x: never = kind;
      return _x;
    }
  }
}

export function shareBoardMarkup(mode: Mode, dateId: string): string {
  return shareSilhouettes(mode, dateId)
    .map(
      (kind) =>
        `<span class="card-sil" aria-hidden="true"><svg viewBox="0 0 100 100"><g transform="translate(50 50)">${silhouetteSvg(kind)}</g></svg></span>`,
    )
    .join("");
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
  ctx.font = "700 64px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  setTracking(ctx, "16px");
  ctx.fillText("SKEW", w / 2, 150);

  drawBrandBars(ctx, w / 2, 230);

  const sils = shareSilhouettes(input.mode, input.dateId);
  drawSilBoard(ctx, w / 2, 520, sils);

  setTracking(ctx, "0px");
  ctx.font = "800 128px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = TEXT;
  ctx.fillText(formatScore(input.score), w / 2, 820);

  ctx.font = "500 34px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(cardMetaLine(input.roundLabel, input.newBest), w / 2, 880);

  const dateLine = cardDateLine(input.mode, input.dateId);
  if (dateLine) {
    ctx.fillStyle = MUTED;
    ctx.font = "500 28px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(dateLine, w / 2, 928);
  }

  ctx.fillStyle = MUTED;
  ctx.font = "500 34px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("Can you beat me?", w / 2, 1040);

  ctx.fillStyle = ACCENT;
  ctx.fillRect(w / 2 - 48, 1076, 96, 8);

  ctx.fillStyle = TEXT;
  ctx.font = "600 26px ui-sans-serif, system-ui, sans-serif";
  setTracking(ctx, "1px");
  ctx.fillText(shareLockup(), w / 2, 1188);

  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob"))), "image/png");
  });
}

function drawSilBoard(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  sils: [ShareSil, ShareSil, ShareSil],
): void {
  const cardW = 220;
  const cardH = 300;
  const gap = 28;
  const total = cardW * 3 + gap * 2;
  let x = cx - total / 2;
  sils.forEach((kind) => {
    rounded(ctx, x, cy - cardH / 2, cardW, cardH, 28);
    ctx.fillStyle = SURFACE;
    ctx.fill();
    ctx.save();
    ctx.translate(x + cardW / 2, cy);
    drawSil(ctx, kind);
    ctx.restore();
    x += cardW + gap;
  });
}

function drawSil(ctx: CanvasRenderingContext2D, kind: ShareSil): void {
  ctx.fillStyle = TEXT;
  ctx.strokeStyle = TEXT;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  switch (kind) {
    case "circle":
      ctx.beginPath();
      ctx.arc(0, 0, 58, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "triangle":
      ctx.beginPath();
      ctx.moveTo(0, -64);
      ctx.lineTo(58, 52);
      ctx.lineTo(-58, 52);
      ctx.closePath();
      ctx.fill();
      break;
    case "diamond":
      ctx.beginPath();
      ctx.moveTo(0, -64);
      ctx.lineTo(54, 0);
      ctx.lineTo(0, 64);
      ctx.lineTo(-54, 0);
      ctx.closePath();
      ctx.fill();
      break;
    case "bars":
      for (const bx of [-48, -12, 24]) {
        rounded(ctx, bx, -56, 22, 112, 8);
        ctx.fill();
      }
      break;
    case "slash":
      ctx.lineWidth = 22;
      ctx.beginPath();
      ctx.moveTo(-44, 48);
      ctx.lineTo(44, -48);
      ctx.stroke();
      break;
    case "chevron":
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.moveTo(-42, -44);
      ctx.lineTo(38, 0);
      ctx.lineTo(-42, 44);
      ctx.stroke();
      break;
    case "capsule":
      rounded(ctx, -28, -64, 56, 128, 28);
      ctx.fill();
      break;
    case "plus":
      ctx.beginPath();
      ctx.moveTo(-18, -60);
      ctx.lineTo(18, -60);
      ctx.lineTo(18, -18);
      ctx.lineTo(60, -18);
      ctx.lineTo(60, 18);
      ctx.lineTo(18, 18);
      ctx.lineTo(18, 60);
      ctx.lineTo(-18, 60);
      ctx.lineTo(-18, 18);
      ctx.lineTo(-60, 18);
      ctx.lineTo(-60, -18);
      ctx.lineTo(-18, -18);
      ctx.closePath();
      ctx.fill();
      break;
    default: {
      const _x: never = kind;
      return _x;
    }
  }
}

/** Brand mark only: three upright bars, middle slightly skewed. No puzzles, rupee, or chips. */
function drawBrandBars(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  const barW = 22;
  const barH = 56;
  const gap = 16;
  const rx = 7;
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
