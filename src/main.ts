import "./styles.css";
import {
  DAILY_ROUNDS,
  DAILY_SEED_VERSION,
  LIVES,
  SITE_URL,
} from "./config";
import { Engine } from "./game/engine";
import {
  dailyDateFromSearch,
  dailySeed,
  formatCountdown,
  formatScore,
  hasDailyParam,
  logoMark,
  msUntilNextUtcMidnight,
  randomSeed,
  shapeSvg,
  syncDailyQuery,
} from "./game/index";
import { getDailySubmit, recordRun } from "./storage";
import { cardDateLine, challengeText, shareBoardMarkup, shareLockup, shareResult } from "./share";
import type { Mode, RunSnapshot } from "./game/types";

function root(): HTMLDivElement {
  const node = document.querySelector<HTMLDivElement>("#app");
  if (!node) throw new Error("#app");
  return node;
}

const app = root();

let engine: Engine | null = null;
let raf = 0;
let lastResult: (RunSnapshot & { best: number; newBest: boolean; submitted: boolean }) | null =
  null;

function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* ignore */
  }
}

function show(html: string): void {
  app.innerHTML = html;
}

function activeDailyDate(): string {
  return dailyDateFromSearch(location.search);
}

function landing(): void {
  cancelAnimationFrame(raf);
  engine = null;
  const dateId = activeDailyDate();
  const submit = getDailySubmit(dateId);
  const reset = formatCountdown(msUntilNextUtcMidnight());
  const dailyNote = submit
    ? `Today ${formatScore(submit.score)}`
    : `${DAILY_ROUNDS} rounds · UTC`;
  show(`
    <main class="screen landing">
      <div class="landing-mark text-ink">${logoMark()}</div>
      <h1 class="wordmark">SKEW</h1>
      <p class="tagline"><span class="find">Find</span> the fake.</p>
      <div class="actions">
        <button class="btn btn-primary" data-act="play" type="button">Play</button>
        <button class="btn btn-ghost" data-act="daily" type="button">Daily<span class="btn-sub">${dailyNote}</span></button>
      </div>
      <p class="fine">Free. No account. 3 lives. Combo. ~45–90s.</p>
      <p class="fine muted">Daily resets in ${reset}</p>
    </main>
  `);
  app.querySelector("[data-act=play]")?.addEventListener("click", () => startGame("endless"));
  app.querySelector("[data-act=daily]")?.addEventListener("click", () => startGame("daily"));
}

function startGame(mode: Mode, practice = false): void {
  const dateId = activeDailyDate();
  if (mode === "daily") syncDailyQuery(dateId);
  const seed = mode === "daily" ? dailySeed(dateId, DAILY_SEED_VERSION) : randomSeed();
  const already = mode === "daily" && Boolean(getDailySubmit(dateId));
  engine = new Engine({
    mode,
    seed,
    date: mode === "daily" ? dateId : undefined,
    practice: practice || already,
  });
  engine.start();
  renderGame();
  loop();
}

function livesMarkup(n: number): string {
  return Array.from({ length: LIVES }, (_, i) => {
    const on = i < n;
    return `<span class="life ${on ? "on" : "off"}"></span>`;
  }).join("");
}

function renderGame(): void {
  if (!engine) return;
  const e = engine;
  const round = e.current;
  const remaining = e.remaining();
  const frac = Math.max(0, remaining / round.durationMs);
  const urgent = frac < 0.22;
  const combo = e.combo >= 2 ? `<div class="combo">×${e.combo}</div>` : `<div class="combo ghost"></div>`;
  const modeLabel = e.mode === "daily" ? `Daily ${e.roundIndex + 1}/${DAILY_ROUNDS}` : `Round ${e.roundIndex + 1}`;
  show(`
    <main class="screen game" data-screen="game">
      <header class="hud">
        <div class="lives" aria-label="${e.lives} lives">${livesMarkup(e.lives)}</div>
        <div class="hud-score" aria-live="polite">${formatScore(e.score)}</div>
      </header>
      <div class="timer ${urgent ? "urgent" : ""}" aria-hidden="true"><i style="transform:scaleX(${frac})"></i></div>
      <p class="round-label">${modeLabel}</p>
      ${combo}
      <div class="board" role="group" aria-label="Three shapes. Tap the fake.">
        ${round.items
          .map(
            (item, i) =>
              `<button class="card" type="button" data-i="${i}" aria-label="Shape ${i + 1}">${shapeSvg(item)}</button>`,
          )
          .join("")}
      </div>
    </main>
  `);
  app.querySelectorAll<HTMLButtonElement>(".card").forEach((btn) => {
    btn.addEventListener("click", () => onTap(Number(btn.dataset.i)));
  });
}

function loop(): void {
  cancelAnimationFrame(raf);
  const step = () => {
    if (!engine || engine.over) return;
    const remaining = engine.remaining();
    const bar = app.querySelector<HTMLElement>(".timer i");
    if (bar) {
      const frac = Math.max(0, remaining / engine.current.durationMs);
      bar.style.transform = `scaleX(${frac})`;
      bar.parentElement?.classList.toggle("urgent", frac < 0.22);
    }
    if (remaining <= 0) {
      onTimeout();
      return;
    }
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
}

function onTap(index: number): void {
  if (!engine) return;
  const result = engine.tap(index);
  if (!result) return;
  cancelAnimationFrame(raf);
  flash(index, result.verdict === "hit");
  if (result.verdict === "hit") vibrate(12);
  else vibrate([30, 40, 30]);
  afterVerdict(result.gameOver);
}

function onTimeout(): void {
  if (!engine) return;
  const result = engine.timeout();
  if (!result) return;
  cancelAnimationFrame(raf);
  flash(engine.current.oddIndex, false);
  vibrate([30, 40, 30]);
  afterVerdict(result.gameOver);
}

function flash(index: number, hit: boolean): void {
  const cards = app.querySelectorAll<HTMLButtonElement>(".card");
  cards.forEach((c, i) => {
    c.disabled = true;
    if (i === index) c.classList.add(hit ? "hit" : "miss");
    if (!hit && engine && i === engine.current.oddIndex) c.classList.add("truth");
  });
}

function afterVerdict(gameOver: boolean): void {
  const delay = gameOver ? 640 : 280;
  window.setTimeout(() => {
    if (!engine) return;
    if (gameOver) {
      finish();
      return;
    }
    const cont = engine.advance();
    if (!cont) {
      finish();
      return;
    }
    renderGame();
    loop();
  }, delay);
}

function finish(): void {
  if (!engine) return;
  cancelAnimationFrame(raf);
  const snap = engine.snapshot();
  const rec = recordRun(snap);
  lastResult = { ...snap, ...rec };
  renderResults();
}

function roundLabel(snap: RunSnapshot): string {
  const n = snap.ended === "complete" ? (snap.mode === "daily" ? DAILY_ROUNDS : snap.roundIndex) : snap.roundIndex + 1;
  return `Round ${n}`;
}

function renderResults(): void {
  const snap = lastResult;
  if (!snap) {
    landing();
    return;
  }
  const dateId = snap.date ?? activeDailyDate();
  const shareOrigin = SITE_URL || location.origin;
  const label = roundLabel(snap);
  const bestLine = snap.newBest ? "New best" : `Best ${formatScore(snap.best)}`;
  const modeLine = snap.mode === "daily" ? (snap.practice ? "Daily practice" : "Daily") : "Endless";
  const submitLine =
    snap.mode === "daily" && snap.submitted
      ? "Saved for today"
      : snap.mode === "daily" && snap.practice
        ? "Practice · first run already saved"
        : "";
  show(`
    <main class="screen results">
      <article class="score-card" aria-label="Score card">
        <p class="card-brand">SKEW</p>
        <div class="card-mark">${logoMark()}</div>
        <div class="card-sils">${shareBoardMarkup(snap.mode, dateId)}</div>
        <p class="card-score">${formatScore(snap.score)}</p>
        <p class="card-meta">${label} · ${snap.newBest ? "New best" : bestLine}</p>
        ${snap.mode === "daily" && cardDateLine(snap.mode, dateId) ? `<p class="card-date">${cardDateLine(snap.mode, dateId)}</p>` : ""}
        <p class="card-cta">Can you beat me?</p>
        <i class="card-rule" aria-hidden="true"></i>
        <p class="card-url">${shareLockup()}</p>
      </article>
      <p class="result-kicker">${modeLine}${submitLine ? ` · ${submitLine}` : ""}</p>
      <div class="actions">
        <button class="btn btn-primary" data-act="share" type="button">Share card</button>
        <button class="btn btn-ghost" data-act="challenge" type="button">Challenge a friend</button>
        <button class="btn btn-ghost" data-act="again" type="button">Play again</button>
        <button class="btn btn-text" data-act="home" type="button">Home</button>
      </div>
    </main>
  `);
  app.querySelector("[data-act=share]")?.addEventListener("click", async (ev) => {
    const btn = ev.currentTarget as HTMLButtonElement;
    btn.disabled = true;
    try {
      const status = await shareResult({
        score: snap.score,
        roundLabel: label,
        newBest: snap.newBest,
        mode: snap.mode,
        dateId,
      });
      btn.textContent = status === "shared" ? "Shared" : status === "copied" ? "Saved + copied" : "Saved";
    } catch {
      btn.textContent = "Share failed";
    } finally {
      window.setTimeout(() => {
        btn.disabled = false;
        btn.textContent = "Share card";
      }, 1600);
    }
  });
  app.querySelector("[data-act=challenge]")?.addEventListener("click", async (ev) => {
    const btn = ev.currentTarget as HTMLButtonElement;
    const text = challengeText(snap.score, shareOrigin, dateId);
    try {
      if (navigator.share) {
        await navigator.share({ title: "SKEW", text });
      } else {
        await navigator.clipboard.writeText(text);
        btn.textContent = "Copied";
        window.setTimeout(() => {
          btn.textContent = "Challenge a friend";
        }, 1400);
      }
    } catch {
      /* abort */
    }
  });
  app.querySelector("[data-act=again]")?.addEventListener("click", () => startGame(snap.mode, snap.mode === "daily"));
  app.querySelector("[data-act=home]")?.addEventListener("click", landing);
}

function onKey(ev: KeyboardEvent): void {
  if (ev.key === "1" || ev.key === "2" || ev.key === "3") {
    if (!engine || engine.over) return;
    onTap(Number(ev.key) - 1);
  }
  if ((ev.key === "Enter" || ev.key === " ") && !engine) {
    const play = app.querySelector<HTMLButtonElement>("[data-act=play]");
    if (play && document.activeElement === document.body) {
      ev.preventDefault();
      play.click();
    }
  }
}

window.addEventListener("keydown", onKey);
if (hasDailyParam(location.search)) startGame("daily");
else landing();
