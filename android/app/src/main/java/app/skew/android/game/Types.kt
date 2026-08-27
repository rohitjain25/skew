package app.skew.android.game

enum class Mode { ENDLESS, DAILY }

enum class Family {
    CARD, CIRCLE, TRIANGLE, DIAMOND, HEXAGON, STAR, PLUS, RING, CAPSULE,
    CHEVRON, ARC, BARS, DOTS, SLASH, FRAME, PENTAGON,
}

enum class DiffType {
    HUE, SATURATION, SCALE, ROTATION, STROKE, MICRO_DETAIL, OFFSET, COUNT, MIRROR,
}

data class ShapeParams(
    val family: Family,
    val fillH: Double,
    val fillS: Double,
    val fillL: Double,
    val strokeOn: Boolean,
    val strokeW: Double,
    val rotation: Double,
    val scale: Double,
    val offsetX: Double,
    val offsetY: Double,
    val mirror: Boolean,
    val count: Int,
    val micro: Boolean,
    val microSize: Double,
)

data class Round(
    val family: Family,
    val diffType: DiffType,
    val oddIndex: Int,
    val items: List<ShapeParams>,
    val durationMs: Int,
)

enum class Ended { LIVES, COMPLETE }

data class RunSnapshot(
    val mode: Mode,
    val score: Int,
    val roundIndex: Int,
    val roundsHit: Int,
    val lives: Int,
    val combo: Int,
    val seed: UInt,
    val date: String?,
    val ended: Ended,
    val practice: Boolean,
)

enum class Verdict { HIT, MISS, TIMEOUT }
