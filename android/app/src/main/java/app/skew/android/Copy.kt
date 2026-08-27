package app.skew.android

import app.skew.android.game.Mode
import app.skew.android.game.formatScore

/** Web landing Daily button sublabel. */
fun dailyNoteLabel(savedScore: Int?): String =
    if (savedScore == null) "${Config.DAILY_ROUNDS} rounds · UTC"
    else "Today ${formatScore(savedScore)}"

fun resultKicker(mode: Mode, practice: Boolean, submitted: Boolean): String {
    val modeLine = when {
        mode == Mode.DAILY && practice -> "Daily practice"
        mode == Mode.DAILY -> "Daily"
        else -> "Endless"
    }
    val submitLine = when {
        mode == Mode.DAILY && submitted -> "Saved for today"
        mode == Mode.DAILY && practice -> "Practice · first run already saved"
        else -> ""
    }
    return if (submitLine.isEmpty()) modeLine else "$modeLine · $submitLine"
}

fun resultMeta(roundLabel: String, newBest: Boolean, best: Int): String =
    if (newBest) "$roundLabel · New best" else "$roundLabel · Best ${formatScore(best)}"
