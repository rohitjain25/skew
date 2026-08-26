import type { ShapeParams } from "./types";

function hsl(h: number, s: number, l: number): string {
  return `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%)`;
}

function starPath(outer: number, inner: number, points = 5): string {
  const parts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    parts.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return `${parts.join(" ")}Z`;
}

function poly(n: number, r: number, rot = -Math.PI / 2): string {
  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i * 2 * Math.PI) / n;
    parts.push(`${i === 0 ? "M" : "L"}${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`);
  }
  return `${parts.join(" ")}Z`;
}

function familyMarkup(p: ShapeParams, fill: string, stroke: string, sw: number): string {
  const sc = `stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"`;
  switch (p.family) {
    case "card":
      return `<rect x="-16" y="-26" width="32" height="52" rx="6" fill="${fill}" ${sc} />`;
    case "circle": {
      const dots = Array.from({ length: p.count }, (_, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / p.count;
        const x = Math.cos(a) * 14;
        const y = Math.sin(a) * 14;
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2" fill="#0B0B0C" />`;
      }).join("");
      return `<circle r="26" fill="${fill}" ${sc} />${dots}`;
    }
    case "triangle":
      return `<polygon points="0,-26 24,22 -24,22" fill="${fill}" ${sc} />`;
    case "diamond":
      return `<polygon points="0,-28 22,0 0,28 -22,0" fill="${fill}" ${sc} />`;
    case "hexagon":
      return `<path d="${poly(6, 26)}" fill="${fill}" ${sc} />`;
    case "star":
      return `<path d="${starPath(28, 12)}" fill="${fill}" ${sc} />`;
    case "plus":
      return `<path d="M-8,-26 H8 V-8 H26 V8 H8 V26 H-8 V8 H-26 V-8 H-8 Z" fill="${fill}" ${sc} />`;
    case "ring":
      return `<circle r="22" fill="none" stroke="${fill}" stroke-width="${Math.max(sw, 7)}" />`;
    case "capsule":
      return `<rect x="-12" y="-26" width="24" height="52" rx="12" fill="${fill}" ${sc} />`;
    case "chevron":
      return `<path d="M-14,-22 L16,0 L-14,22" fill="none" stroke="${fill}" stroke-width="${Math.max(sw, 6)}" />`;
    case "arc":
      return `<path d="M16,-18 A26,26 0 1 0 16,18" fill="none" stroke="${fill}" stroke-width="${Math.max(sw, 7)}" />`;
    case "bars": {
      const n = Math.max(2, p.count);
      const w = 8;
      const gap = 6;
      const total = n * w + (n - 1) * gap;
      const x0 = -total / 2;
      return Array.from({ length: n }, (_, i) => {
        const x = x0 + i * (w + gap);
        return `<rect x="${x}" y="-24" width="${w}" height="48" rx="3" fill="${fill}" ${sc} />`;
      }).join("");
    }
    case "dots": {
      const n = Math.max(2, p.count);
      return Array.from({ length: n }, (_, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        const x = Math.cos(a) * 18;
        const y = Math.sin(a) * 18;
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.5" fill="${fill}" />`;
      }).join("");
    }
    case "slash":
      return `<path d="M-18,20 L18,-20" fill="none" stroke="${fill}" stroke-width="${Math.max(sw, 7)}" />`;
    case "frame":
      return `<rect x="-22" y="-22" width="44" height="44" rx="4" fill="none" stroke="${fill}" stroke-width="${Math.max(sw, 5)}" />`;
    case "pentagon":
      return `<path d="${poly(5, 26)}" fill="${fill}" ${sc} />`;
    default: {
      const _exhaustive: never = p.family;
      return _exhaustive;
    }
  }
}

function microMarkup(p: ShapeParams, fill: string): string {
  if (!p.micro) return "";
  const r = p.microSize;
  return `<rect x="${18 - r / 2}" y="${-24 - r / 2}" width="${r}" height="${r}" rx="${Math.min(2, r / 3)}" fill="${fill}" />`;
}

export function shapeSvg(p: ShapeParams): string {
  const fill = hsl(p.fillH, p.fillS, p.fillL);
  const stroke = p.strokeOn
    ? hsl(p.fillH, Math.min(p.fillS, 24), Math.max(18, p.fillL - 28))
    : "none";
  const sw = p.strokeOn ? p.strokeW : 0;
  const sx = p.scale * (p.mirror ? -1 : 1);
  const sy = p.scale;
  const transform = `translate(${(50 + p.offsetX).toFixed(2)} ${(50 + p.offsetY).toFixed(2)}) rotate(${p.rotation.toFixed(2)}) scale(${sx.toFixed(3)} ${sy.toFixed(3)})`;
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><g transform="${transform}">${familyMarkup(p, fill, stroke, sw)}${microMarkup(p, fill)}</g></svg>`;
}

export function logoMark(opts?: { skewedDeg?: number; barRx?: number }): string {
  const skew = opts?.skewedDeg ?? -8;
  const rx = opts?.barRx ?? 7;
  return `<svg class="logo-mark" viewBox="0 0 120 72" aria-hidden="true">
    <rect x="4" y="14" width="28" height="44" rx="${rx}" fill="currentColor"/>
    <g transform="rotate(${skew} 60 36)">
      <rect x="46" y="14" width="28" height="44" rx="${rx}" fill="currentColor"/>
    </g>
    <rect x="88" y="14" width="28" height="44" rx="${rx}" fill="currentColor"/>
  </svg>`;
}
