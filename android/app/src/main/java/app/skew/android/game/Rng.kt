package app.skew.android.game

import java.util.Calendar
import java.util.TimeZone

/** FNV-1a 32-bit. Same string → same seed as the web game. */
fun hashString(input: String): UInt {
    var h = 0x811C9DC5.toInt()
    for (ch in input) {
        h = h xor ch.code
        h *= 16777619
    }
    return h.toUInt()
}

class Rng(seed: UInt) {
    private var a: Int = seed.toInt()

    fun float(): Double {
        a += 0x6D2B79F5
        var t = (a xor (a ushr 15)) * (1 or a)
        t = (t + ((t xor (t ushr 7)) * (61 or t))) xor t
        return (t xor (t ushr 14)).toUInt().toDouble() / 4294967296.0
    }

    fun int(max: Int): Int {
        if (max <= 0) return 0
        return kotlin.math.floor(float() * max).toInt()
    }

    fun range(min: Double, max: Double): Double = min + float() * (max - min)

    fun <T> pick(items: List<T>): T {
        require(items.isNotEmpty()) { "Rng.pick: empty" }
        return items[int(items.size)]
    }

    fun chance(p: Double): Boolean = float() < p

    fun sign(): Int = if (float() < 0.5) -1 else 1
}

fun utcDateId(millis: Long = System.currentTimeMillis()): String {
    val cal = Calendar.getInstance(TimeZone.getTimeZone("UTC"))
    cal.timeInMillis = millis
    val y = cal.get(Calendar.YEAR)
    val m = cal.get(Calendar.MONTH) + 1
    val d = cal.get(Calendar.DAY_OF_MONTH)
    return "%04d-%02d-%02d".format(y, m, d)
}

fun dailySeed(dateId: String, version: String): UInt = hashString("$version:$dateId")

fun randomSeed(): UInt = (System.currentTimeMillis().toInt() xor kotlin.random.Random.nextInt()).toUInt()

fun msUntilNextUtcMidnight(nowMillis: Long = System.currentTimeMillis()): Long {
    val cal = Calendar.getInstance(TimeZone.getTimeZone("UTC"))
    cal.timeInMillis = nowMillis
    cal.add(Calendar.DAY_OF_YEAR, 1)
    cal.set(Calendar.HOUR_OF_DAY, 0)
    cal.set(Calendar.MINUTE, 0)
    cal.set(Calendar.SECOND, 0)
    cal.set(Calendar.MILLISECOND, 0)
    return cal.timeInMillis - nowMillis
}
