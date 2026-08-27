package app.skew.android.game

import app.skew.android.Config

class Engine(
    val mode: Mode,
    val seed: UInt,
    val date: String? = null,
    val practice: Boolean = false,
) {
    val maxRounds: Int? = if (mode == Mode.DAILY) Config.DAILY_ROUNDS else null

    var lives: Int = Config.LIVES
        private set
    var score: Int = 0
        private set
    var combo: Int = 0
        private set
    var roundIndex: Int = 0
        private set
    var roundsHit: Int = 0
        private set
    var locked: Boolean = false
        private set
    var startedAt: Double = 0.0
        private set
    var over: Boolean = false
        private set
    var ended: Ended? = null
        private set

    lateinit var current: Round
        private set

    private val rng = Rng(seed)
    private val recent = mutableListOf<DiffType>()

    init {
        current = nextRound()
    }

    fun start(now: Double = 0.0) {
        startedAt = now
        locked = false
    }

    fun remaining(now: Double): Double =
        maxOf(0.0, current.durationMs - (now - startedAt))

    data class TapResult(val verdict: Verdict, val points: Int, val gameOver: Boolean)

    fun tap(index: Int, now: Double): TapResult? {
        if (over || locked) return null
        locked = true
        val remainingMs = remaining(now)
        val hit = index == current.oddIndex && remainingMs > 0
        return resolve(if (hit) Verdict.HIT else Verdict.MISS, remainingMs)
    }

    fun timeout(now: Double): TapResult? {
        if (over || locked) return null
        locked = true
        return resolve(Verdict.TIMEOUT, remaining(now))
    }

    fun advance(now: Double): Boolean {
        if (over) return false
        roundIndex += 1
        if (maxRounds != null && roundIndex >= maxRounds) {
            finish(Ended.COMPLETE)
            return false
        }
        current = nextRound()
        startedAt = now
        locked = false
        return true
    }

    fun snapshot(): RunSnapshot = RunSnapshot(
        mode = mode,
        score = score,
        roundIndex = roundIndex,
        roundsHit = roundsHit,
        lives = lives,
        combo = combo,
        seed = seed,
        date = date,
        ended = ended ?: Ended.LIVES,
        practice = practice,
    )

    private fun resolve(verdict: Verdict, remainingMs: Double): TapResult {
        val points: Int
        if (verdict == Verdict.HIT) {
            combo += 1
            roundsHit += 1
            points = scoreHit(roundIndex, remainingMs, current.durationMs.toDouble(), combo)
            score += points
        } else {
            points = scoreMiss()
            combo = 0
            lives -= 1
            if (lives <= 0) finish(Ended.LIVES)
        }
        return TapResult(verdict, points, over)
    }

    private fun finish(reason: Ended) {
        over = true
        ended = reason
        locked = true
    }

    private fun nextRound(): Round {
        val round = generateRound(rng, roundIndex, recent)
        recent.add(round.diffType)
        if (recent.size > 6) recent.removeAt(0)
        return round
    }
}
