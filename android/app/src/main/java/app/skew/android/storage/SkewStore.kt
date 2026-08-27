package app.skew.android.storage

import android.content.Context
import app.skew.android.game.Ended
import app.skew.android.game.Mode
import app.skew.android.game.RunSnapshot
import app.skew.android.game.utcDateId
import org.json.JSONObject

private const val PREFS = "skew"
private const val ENDLESS_BEST = "skew.pb.endless"
private const val DAILY_BEST_PREFIX = "skew.pb.daily."
private const val DAILY_RUN_PREFIX = "skew.run.daily."

data class DailySubmit(
    val score: Int,
    val roundIndex: Int,
    val roundsHit: Int,
    val ended: Ended,
    val at: String,
)

data class RecordResult(val best: Int, val newBest: Boolean, val submitted: Boolean)

class SkewStore(context: Context) {
    private val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun getEndlessBest(): Int = prefs.getString(ENDLESS_BEST, "0")?.toIntOrNull() ?: 0

    fun getDailyBest(dateId: String = utcDateId()): Int =
        prefs.getString(DAILY_BEST_PREFIX + dateId, "0")?.toIntOrNull() ?: 0

    fun getDailySubmit(dateId: String = utcDateId()): DailySubmit? {
        val raw = prefs.getString(DAILY_RUN_PREFIX + dateId, null) ?: return null
        return try {
            val o = JSONObject(raw)
            DailySubmit(
                score = o.getInt("score"),
                roundIndex = o.getInt("roundIndex"),
                roundsHit = o.getInt("roundsHit"),
                ended = if (o.getString("ended") == "complete") Ended.COMPLETE else Ended.LIVES,
                at = o.getString("at"),
            )
        } catch (_: Exception) {
            null
        }
    }

    fun recordRun(snap: RunSnapshot): RecordResult {
        if (snap.mode == Mode.ENDLESS) {
            val prev = getEndlessBest()
            val best = maxOf(prev, snap.score)
            prefs.edit().putString(ENDLESS_BEST, best.toString()).apply()
            return RecordResult(best, snap.score > prev, submitted = false)
        }
        val dateId = snap.date ?: utcDateId()
        val prevBest = getDailyBest(dateId)
        val best = maxOf(prevBest, snap.score)
        val ed = prefs.edit().putString(DAILY_BEST_PREFIX + dateId, best.toString())
        var submitted = false
        if (!snap.practice && getDailySubmit(dateId) == null) {
            val payload = JSONObject()
                .put("score", snap.score)
                .put("roundIndex", snap.roundIndex)
                .put("roundsHit", snap.roundsHit)
                .put("ended", if (snap.ended == Ended.COMPLETE) "complete" else "lives")
                .put("at", java.time.Instant.now().toString())
            ed.putString(DAILY_RUN_PREFIX + dateId, payload.toString())
            submitted = true
        }
        ed.apply()
        return RecordResult(best, snap.score > prevBest, submitted)
    }

    fun dailyNote(dateId: String = utcDateId()): String =
        app.skew.android.dailyNoteLabel(getDailySubmit(dateId)?.score)
}
