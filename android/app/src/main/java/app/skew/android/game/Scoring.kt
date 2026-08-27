package app.skew.android.game

import java.util.Locale
import kotlin.math.exp
import kotlin.math.floor
import kotlin.math.roundToInt

fun lerp(a: Double, b: Double, t: Double): Double = a + (b - a) * t

fun difficultyT(roundIndex: Int): Double {
    if (roundIndex <= 3) return roundIndex * 0.07
    return minOf(1.0, 0.28 + (1 - exp(-(roundIndex - 3) / 11.0)) * 0.72)
}

fun roundDurationMs(roundIndex: Int): Int {
    val t = minOf(1.0, roundIndex / 16.0)
    return lerp(7200.0, 2400.0, t).roundToInt()
}

fun comboMultiplier(combo: Int): Double {
    val n = maxOf(1, combo)
    return 1.0 + minOf(n - 1, 10) * 0.2
}

fun scoreHit(roundIndex: Int, remainingMs: Double, durationMs: Double, combo: Int): Int {
    val base = 100.0 + roundIndex * 40
    val frac =
        if (durationMs <= 0.0) 0.0
        else remainingMs.coerceIn(0.0, durationMs) / durationMs
    val timeBonus = (frac * (50 + roundIndex * 8)).roundToInt()
    return ((base + timeBonus) * comboMultiplier(combo)).roundToInt()
}

fun scoreMiss(): Int = 0

fun formatScore(n: Int): String =
    String.format(Locale.US, "%,d", maxOf(0, n))

fun formatCountdown(ms: Long): String {
    val total = maxOf(0, floor(ms / 1000.0).toLong())
    val h = total / 3600
    val m = (total % 3600) / 60
    if (h > 0) return "${h}h ${m}m"
    val s = total % 60
    if (m > 0) return "${m}m ${s}s"
    return "${s}s"
}
