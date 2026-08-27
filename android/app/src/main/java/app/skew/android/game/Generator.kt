package app.skew.android.game

import app.skew.android.Config
import kotlin.math.max

private val COLOR_DIFFS = setOf(DiffType.HUE, DiffType.SATURATION)

private val FAMILIES = listOf(
    Family.CARD, Family.CIRCLE, Family.TRIANGLE, Family.DIAMOND, Family.HEXAGON,
    Family.STAR, Family.PLUS, Family.RING, Family.CAPSULE, Family.CHEVRON,
    Family.ARC, Family.BARS, Family.DOTS, Family.SLASH, Family.FRAME, Family.PENTAGON,
)

private val EARLY_FAMILIES = listOf(
    Family.CHEVRON, Family.SLASH, Family.BARS, Family.TRIANGLE, Family.STAR, Family.CARD, Family.ARC,
)

private val FAMILY_DIFFS: Map<Family, List<DiffType>> = mapOf(
    Family.CARD to listOf(DiffType.HUE, DiffType.SATURATION, DiffType.SCALE, DiffType.ROTATION, DiffType.STROKE, DiffType.MICRO_DETAIL, DiffType.OFFSET),
    Family.CIRCLE to listOf(DiffType.HUE, DiffType.SATURATION, DiffType.SCALE, DiffType.STROKE, DiffType.MICRO_DETAIL, DiffType.OFFSET, DiffType.COUNT),
    Family.TRIANGLE to listOf(DiffType.HUE, DiffType.SATURATION, DiffType.SCALE, DiffType.ROTATION, DiffType.STROKE, DiffType.MICRO_DETAIL, DiffType.OFFSET, DiffType.MIRROR),
    Family.DIAMOND to listOf(DiffType.HUE, DiffType.SATURATION, DiffType.SCALE, DiffType.ROTATION, DiffType.STROKE, DiffType.MICRO_DETAIL, DiffType.OFFSET),
    Family.HEXAGON to listOf(DiffType.HUE, DiffType.SATURATION, DiffType.SCALE, DiffType.ROTATION, DiffType.STROKE, DiffType.MICRO_DETAIL, DiffType.OFFSET),
    Family.STAR to listOf(DiffType.HUE, DiffType.SATURATION, DiffType.SCALE, DiffType.ROTATION, DiffType.STROKE, DiffType.MICRO_DETAIL, DiffType.OFFSET),
    Family.PLUS to listOf(DiffType.HUE, DiffType.SATURATION, DiffType.SCALE, DiffType.ROTATION, DiffType.STROKE, DiffType.MICRO_DETAIL, DiffType.OFFSET),
    Family.RING to listOf(DiffType.HUE, DiffType.SATURATION, DiffType.SCALE, DiffType.STROKE, DiffType.MICRO_DETAIL, DiffType.OFFSET),
    Family.CAPSULE to listOf(DiffType.HUE, DiffType.SATURATION, DiffType.SCALE, DiffType.ROTATION, DiffType.STROKE, DiffType.MICRO_DETAIL, DiffType.OFFSET),
    Family.CHEVRON to listOf(DiffType.HUE, DiffType.SATURATION, DiffType.SCALE, DiffType.ROTATION, DiffType.STROKE, DiffType.OFFSET, DiffType.MIRROR),
    Family.ARC to listOf(DiffType.HUE, DiffType.SATURATION, DiffType.SCALE, DiffType.ROTATION, DiffType.STROKE, DiffType.OFFSET, DiffType.MIRROR),
    Family.BARS to listOf(DiffType.HUE, DiffType.SATURATION, DiffType.SCALE, DiffType.ROTATION, DiffType.STROKE, DiffType.OFFSET, DiffType.COUNT),
    Family.DOTS to listOf(DiffType.HUE, DiffType.SATURATION, DiffType.SCALE, DiffType.ROTATION, DiffType.OFFSET, DiffType.COUNT),
    Family.SLASH to listOf(DiffType.HUE, DiffType.SATURATION, DiffType.SCALE, DiffType.ROTATION, DiffType.STROKE, DiffType.OFFSET, DiffType.MIRROR),
    Family.FRAME to listOf(DiffType.HUE, DiffType.SATURATION, DiffType.SCALE, DiffType.ROTATION, DiffType.STROKE, DiffType.MICRO_DETAIL, DiffType.OFFSET),
    Family.PENTAGON to listOf(DiffType.HUE, DiffType.SATURATION, DiffType.SCALE, DiffType.ROTATION, DiffType.STROKE, DiffType.MICRO_DETAIL, DiffType.OFFSET),
)

private fun pickDiff(rng: Rng, family: Family, roundIndex: Int, recent: List<DiffType>): DiffType {
    var pool = FAMILY_DIFFS.getValue(family).toMutableList()
    val lastTwoColor = recent.size >= 2 && recent.takeLast(2).all { it in COLOR_DIFFS }
    if (lastTwoColor) pool = pool.filter { it !in COLOR_DIFFS }.toMutableList()
    if (roundIndex < 5) {
        val structural = pool.filter { it !in COLOR_DIFFS }
        if (structural.isNotEmpty()) pool = structural.toMutableList()
    }
    if (roundIndex < 4) {
        val obvious = pool.filter {
            it == DiffType.ROTATION || it == DiffType.SCALE || it == DiffType.COUNT ||
                it == DiffType.OFFSET || it == DiffType.MIRROR
        }
        if (obvious.isNotEmpty()) pool = obvious.toMutableList()
    }
    if (pool.isEmpty()) pool = FAMILY_DIFFS.getValue(family).toMutableList()
    return rng.pick(pool)
}

private fun baseParams(rng: Rng, family: Family, t: Double): ShapeParams {
    val chromatic = rng.chance(0.42)
    val fillH = rng.range(0.0, 360.0)
    val fillS = if (chromatic) rng.range(38.0, 68.0) else rng.range(6.0, 16.0)
    val fillL = if (chromatic) rng.range(58.0, 74.0) else rng.range(88.0, 94.0)
    val countBase = when (family) {
        Family.DOTS -> 4 + rng.int(2)
        Family.BARS -> 3 + rng.int(2)
        Family.CIRCLE -> 3 + rng.int(2)
        else -> 3
    }
    return ShapeParams(
        family = family,
        fillH = fillH,
        fillS = fillS,
        fillL = fillL,
        strokeOn = family == Family.FRAME || family == Family.RING || rng.chance(0.28),
        strokeW = lerp(5.5, 2.2, t),
        rotation = if (family == Family.CIRCLE || family == Family.RING || t < 0.22) 0.0 else rng.range(-10.0, 10.0),
        scale = 1.0,
        offsetX = 0.0,
        offsetY = 0.0,
        mirror = false,
        count = countBase,
        micro = false,
        microSize = lerp(9.0, 3.2, t),
    )
}

private fun clamp(n: Double, lo: Double, hi: Double): Double = minOf(hi, maxOf(lo, n))

private fun applyDiff(rng: Rng, base: ShapeParams, diff: DiffType, t: Double): ShapeParams {
    var odd = base.copy()
    val sign = rng.sign()
    when (diff) {
        DiffType.HUE -> odd = odd.copy(fillH = (odd.fillH + sign * lerp(46.0, 7.0, t) + 360) % 360)
        DiffType.SATURATION -> odd = odd.copy(fillS = clamp(odd.fillS + sign * lerp(34.0, 8.0, t), 4.0, 90.0))
        DiffType.SCALE -> odd = odd.copy(scale = lerp(1.42, 1.055, t))
        DiffType.ROTATION -> odd = odd.copy(rotation = odd.rotation + sign * lerp(34.0, 3.4, t))
        DiffType.STROKE -> {
            odd = if (base.strokeOn) {
                odd.copy(strokeW = max(0.8, base.strokeW + sign * lerp(4.2, 1.15, t)))
            } else {
                odd.copy(strokeOn = true, strokeW = lerp(6.5, 1.7, t))
            }
        }
        DiffType.MICRO_DETAIL -> odd = odd.copy(micro = true, microSize = lerp(10.0, 3.1, t))
        DiffType.OFFSET -> {
            val mag = lerp(20.0, 2.8, t)
            odd = if (rng.chance(0.5)) odd.copy(offsetX = sign * mag) else odd.copy(offsetY = sign * mag)
        }
        DiffType.COUNT -> {
            var c = max(1, base.count + if (rng.chance(0.5)) 1 else -1)
            if (c == base.count) c = base.count + 1
            odd = odd.copy(count = c)
        }
        DiffType.MIRROR -> odd = odd.copy(mirror = !base.mirror)
    }
    return odd
}

fun generateRound(rng: Rng, roundIndex: Int, recent: List<DiffType>): Round {
    val t = difficultyT(roundIndex)
    var family = rng.pick(FAMILIES)
    if (roundIndex < 4) family = rng.pick(EARLY_FAMILIES)
    val diffType = pickDiff(rng, family, roundIndex, recent)
    val oddIndex = rng.int(3)
    val base = baseParams(rng, family, t)
    val odd = applyDiff(rng, base, diffType, t)
    val items = mutableListOf(base.copy(), base.copy(), base.copy())
    items[oddIndex] = odd
    return Round(
        family = family,
        diffType = diffType,
        oddIndex = oddIndex,
        items = items,
        durationMs = roundDurationMs(roundIndex),
    )
}

fun generateRun(seed: UInt, count: Int): List<Round> {
    val rng = Rng(seed)
    val recent = mutableListOf<DiffType>()
    val rounds = mutableListOf<Round>()
    for (i in 0 until count) {
        val round = generateRound(rng, i, recent)
        recent.add(round.diffType)
        if (recent.size > 6) recent.removeAt(0)
        rounds.add(round)
    }
    return rounds
}

fun generateDaily(dateId: String): List<Round> =
    generateRun(dailySeed(dateId, Config.DAILY_SEED_VERSION), Config.DAILY_ROUNDS)

fun isColorDiff(d: DiffType): Boolean = d in COLOR_DIFFS
