package app.skew.android.game

import java.util.Calendar
import java.util.TimeZone
import java.util.regex.Pattern

private val DATE_RE = Pattern.compile("^(\\d{4})-(\\d{2})-(\\d{2})$")

fun isUtcDateId(value: String): Boolean {
    val m = DATE_RE.matcher(value)
    if (!m.matches()) return false
    val y = m.group(1)!!.toInt()
    val mo = m.group(2)!!.toInt()
    val d = m.group(3)!!.toInt()
    val cal = Calendar.getInstance(TimeZone.getTimeZone("UTC"))
    cal.clear()
    cal.set(Calendar.YEAR, y)
    cal.set(Calendar.MONTH, mo - 1)
    cal.set(Calendar.DAY_OF_MONTH, d)
    return cal.get(Calendar.YEAR) == y &&
        cal.get(Calendar.MONTH) == mo - 1 &&
        cal.get(Calendar.DAY_OF_MONTH) == d
}

fun dailyDateFromSearch(search: String, nowMillis: Long = System.currentTimeMillis()): String {
    val q = if (search.startsWith("?")) search.substring(1) else search
    val raw = q.split("&").mapNotNull { part ->
        val i = part.indexOf("=")
        if (i < 0) null else part.substring(0, i) to part.substring(i + 1)
    }.firstOrNull { it.first == "d" }?.second
    if (raw != null && isUtcDateId(raw)) return raw
    return utcDateId(nowMillis)
}

fun hasDailyParam(search: String): Boolean {
    val q = if (search.startsWith("?")) search.substring(1) else search
    val raw = q.split("&").mapNotNull { part ->
        val i = part.indexOf("=")
        if (i < 0) null else part.substring(0, i) to part.substring(i + 1)
    }.firstOrNull { it.first == "d" }?.second
    return raw != null && isUtcDateId(raw)
}

fun dailyPath(dateId: String): String = "/?d=$dateId"

private const val APP_LINK_HOST = "temporary-zippy-mistral-mg92d6h.vercel.app"

/**
 * UTC date for an https App Link to the live host.
 * Missing or invalid `d` falls back to UTC today. Unknown hosts return null
 * so a cold launcher start does not auto-play Daily.
 */
fun dateIdFromDeepLink(uriString: String?, nowMillis: Long = System.currentTimeMillis()): String? {
    if (uriString.isNullOrBlank()) return null
    val uri = try {
        java.net.URI(uriString)
    } catch (_: Exception) {
        return null
    }
    val host = uri.host ?: return null
    if (host != APP_LINK_HOST) return null
    val scheme = uri.scheme ?: return null
    if (scheme != "https" && scheme != "http") return null
    return dailyDateFromSearch(uri.rawQuery ?: uri.query ?: "", nowMillis)
}
