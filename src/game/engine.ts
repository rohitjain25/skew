import { DAILY_ROUNDS, LIVES } from "../config";
import { generateRound } from "./generator";
import { RNG } from "./rng";
import { scoreHit, scoreMiss } from "./scoring";
import type { DiffType, Mode, Round, RunSnapshot } from "./types";

export type Verdict = "hit" | "miss" | "timeout";

export class Engine {
  readonly mode: Mode;
  readonly seed: number;
  readonly date?: string;
  readonly practice: boolean;
  readonly maxRounds: number | null;

  lives = LIVES;
  score = 0;
  combo = 0;
  roundIndex = 0;
  roundsHit = 0;
  locked = false;
  startedAt = 0;
  over = false;
  ended: RunSnapshot["ended"] | null = null;

  current!: Round;
  private readonly rng: RNG;
  private readonly recent: DiffType[] = [];

  constructor(opts: { mode: Mode; seed: number; date?: string; practice?: boolean }) {
    this.mode = opts.mode;
    this.seed = opts.seed;
    this.date = opts.date;
    this.practice = Boolean(opts.practice);
    this.maxRounds = opts.mode === "daily" ? DAILY_ROUNDS : null;
    this.rng = new RNG(opts.seed);
    this.current = this.nextRound();
  }

  start(now = performance.now()): void {
    this.startedAt = now;
    this.locked = false;
  }

  remaining(now = performance.now()): number {
    return Math.max(0, this.current.durationMs - (now - this.startedAt));
  }

  tap(index: number, now = performance.now()): { verdict: Verdict; points: number; gameOver: boolean } | null {
    if (this.over || this.locked) return null;
    this.locked = true;
    const remainingMs = this.remaining(now);
    const hit = index === this.current.oddIndex && remainingMs > 0;
    return this.resolve(hit ? "hit" : "miss", remainingMs);
  }

  timeout(now = performance.now()): { verdict: Verdict; points: number; gameOver: boolean } | null {
    if (this.over || this.locked) return null;
    this.locked = true;
    return this.resolve("timeout", this.remaining(now));
  }

  advance(now = performance.now()): boolean {
    if (this.over) return false;
    this.roundIndex += 1;
    if (this.maxRounds !== null && this.roundIndex >= this.maxRounds) {
      this.finish("complete");
      return false;
    }
    this.current = this.nextRound();
    this.startedAt = now;
    this.locked = false;
    return true;
  }

  snapshot(): RunSnapshot {
    return {
      mode: this.mode,
      score: this.score,
      roundIndex: this.roundIndex,
      roundsHit: this.roundsHit,
      lives: this.lives,
      combo: this.combo,
      seed: this.seed,
      date: this.date,
      ended: this.ended ?? "lives",
      practice: this.practice,
    };
  }

  private resolve(verdict: Verdict, remainingMs: number): {
    verdict: Verdict;
    points: number;
    gameOver: boolean;
  } {
    let points = 0;
    if (verdict === "hit") {
      this.combo += 1;
      this.roundsHit += 1;
      points = scoreHit({
        roundIndex: this.roundIndex,
        remainingMs,
        durationMs: this.current.durationMs,
        combo: this.combo,
      });
      this.score += points;
    } else {
      points = scoreMiss();
      this.combo = 0;
      this.lives -= 1;
      if (this.lives <= 0) {
        this.finish("lives");
      }
    }
    return { verdict, points, gameOver: this.over };
  }

  private finish(reason: RunSnapshot["ended"]): void {
    this.over = true;
    this.ended = reason;
    this.locked = true;
  }

  private nextRound(): Round {
    const round = generateRound(this.rng, this.roundIndex, this.recent);
    this.recent.push(round.diffType);
    if (this.recent.length > 6) this.recent.shift();
    return round;
  }
}
