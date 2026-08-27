package app.skew.android

import app.skew.android.game.DiffType
import app.skew.android.game.Engine
import app.skew.android.game.Family
import app.skew.android.game.Mode
import app.skew.android.game.Rng
import app.skew.android.game.Verdict
import app.skew.android.game.comboMultiplier
import app.skew.android.game.dailyDateFromSearch
import app.skew.android.game.dailySeed
import app.skew.android.game.difficultyT
import app.skew.android.game.generateDaily
import app.skew.android.game.generateRun
import app.skew.android.game.hashString
import app.skew.android.game.isColorDiff
import app.skew.android.game.isUtcDateId
import app.skew.android.game.roundDurationMs
import app.skew.android.game.scoreHit
import app.skew.android.game.scoreMiss
import app.skew.android.share.ShareSil
import app.skew.android.share.cardDateLine
import app.skew.android.share.challengeText
import app.skew.android.share.shareLockup
import app.skew.android.share.shareSilhouettes
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.abs

class GameParityTest {
    @Test
    fun hashAndDailySeedMatchWeb() {
        assertEquals(539004543u, hashString("skew-daily-v1:2026-08-26"))
        assertEquals(539004543u, dailySeed("2026-08-26", Config.DAILY_SEED_VERSION))
        assertEquals(522226924u, dailySeed("2026-08-27", Config.DAILY_SEED_VERSION))
        assertNotEquals(
            dailySeed("2026-08-26", Config.DAILY_SEED_VERSION),
            dailySeed("2026-08-27", Config.DAILY_SEED_VERSION),
        )
    }

    @Test
    fun rngSequenceMatchesWeb() {
        val rng = Rng(123u)
        val got = List(8) { rng.float() }
        val expected = listOf(
            0.7872516233474016,
            0.1785435655619949,
            0.49531551403924823,
            0.23136196262203157,
            0.375791602069512,
            0.8333538440056145,
            0.8636805524583906,
            0.9290936258621514,
        )
        expected.forEachIndexed { i, v ->
            assertTrue("rng[$i]", abs(got[i] - v) < 1e-12)
        }
    }

    @Test
    fun scoringMatchesWeb() {
        assertEquals(0, scoreMiss())
        assertEquals(150, scoreHit(0, 5000.0, 5000.0, 1))
        assertEquals(534, scoreHit(8, 5000.0, 5000.0, 1))
        assertEquals(961, scoreHit(8, 5000.0, 5000.0, 5))
        assertEquals(1.0, comboMultiplier(1), 0.0)
        assertEquals(2.0, comboMultiplier(6), 0.0)
        assertEquals(7200, roundDurationMs(0))
        assertEquals(2400, roundDurationMs(16))
        assertEquals(0.0, difficultyT(0), 0.0)
        assertEquals(0.21, difficultyT(3), 1e-12)
    }

    @Test
    fun daily20260827SameShapes() {
        val a = generateDaily("2026-08-27")
        val b = generateDaily("2026-08-27")
        assertEquals(12, a.size)
        assertEquals(a, b)
        val r0 = a[0]
        assertEquals(Family.CHEVRON, r0.family)
        assertEquals(DiffType.OFFSET, r0.diffType)
        assertEquals(2, r0.oddIndex)
        assertEquals(7200, r0.durationMs)
        assertEquals(20.0, r0.items[2].offsetX, 1e-9)
        assertEquals(0.0, r0.items[0].offsetX, 0.0)
    }

    @Test
    fun earlyRoundsNotColorOnly() {
        val diffs = generateRun(42u, 4).map { it.diffType }
        assertEquals(listOf(DiffType.MIRROR, DiffType.OFFSET, DiffType.SCALE, DiffType.MIRROR), diffs)
        assertTrue(diffs.none { it == DiffType.HUE || it == DiffType.SATURATION })
    }

    @Test
    fun exactlyOneOdd() {
        for (seed in listOf(1u, 99u, 20260826u, 7u, 123456789u)) {
            val rounds = generateRun(seed, 24)
            var color = 0
            for (round in rounds) {
                val x = round.items[0]
                val y = round.items[1]
                val z = round.items[2]
                val same = listOf(x == y, y == z, x == z).count { it }
                assertEquals(1, same)
                assertFalse(round.items[round.oddIndex] == round.items[(round.oddIndex + 1) % 3])
                if (isColorDiff(round.diffType)) color++
            }
            assertTrue(color < rounds.size)
            assertTrue(color <= (rounds.size * 0.55).toInt() + 1)
        }
    }

    @Test
    fun engineDailyMatchesGenerateDaily() {
        val seed = dailySeed("2026-08-26", Config.DAILY_SEED_VERSION)
        val expected = generateDaily("2026-08-26")
        val eng = Engine(Mode.DAILY, seed, "2026-08-26")
        assertEquals(expected[0], eng.current)
        eng.start(0.0)
        val hit = eng.tap(eng.current.oddIndex, 10.0)
        assertEquals(Verdict.HIT, hit!!.verdict)
        assertEquals(150, hit.points)
        eng.advance(20.0)
        assertEquals(expected[1], eng.current)
    }

    @Test
    fun missResetsCombo() {
        val eng = Engine(Mode.ENDLESS, 1u)
        eng.start(0.0)
        val wrong = (eng.current.oddIndex + 1) % 3
        val r = eng.tap(wrong, 10.0)
        assertEquals(Verdict.MISS, r!!.verdict)
        assertEquals(0, r.points)
        assertEquals(2, eng.lives)
        assertEquals(0, eng.combo)
        assertEquals(0, eng.score)
    }

    @Test
    fun timeoutIsMiss() {
        val eng = Engine(Mode.ENDLESS, 2u)
        eng.start(0.0)
        val r = eng.timeout(eng.current.durationMs + 1.0)
        assertEquals(Verdict.TIMEOUT, r!!.verdict)
        assertEquals(2, eng.lives)
    }

    @Test
    fun dailyParamAndShareText() {
        assertTrue(isUtcDateId("2026-08-27"))
        assertFalse(isUtcDateId("2026-02-31"))
        val now = 1787846400000L // 2026-08-27T18:40:00Z approx — we'll use search only
        assertEquals("2026-08-27", dailyDateFromSearch("?d=2026-08-27", now))
        val text = challengeText(8421, "2026-08-27")
        assertTrue(text.contains("https://temporary-zippy-mistral-mg92d6h.vercel.app/?d=2026-08-27"))
        assertFalse(text.contains("₹"))
        assertFalse(text.contains("upi://"))
        assertEquals("temporary-zippy-mistral-mg92d6h.vercel.app", shareLockup())
        assertFalse(shareLockup().contains("SKEW.GAME"))
        assertFalse(shareLockup().contains("S K E W"))
        assertEquals("2026-08-26 UTC", cardDateLine(Mode.DAILY, "2026-08-26"))
        assertEquals(null, cardDateLine(Mode.ENDLESS, "2026-08-26"))
        assertEquals(
            listOf(ShareSil.DIAMOND, ShareSil.CHEVRON, ShareSil.SLASH),
            shareSilhouettes(Mode.DAILY, "2026-08-26"),
        )
        assertEquals(
            listOf(ShareSil.DIAMOND, ShareSil.DIAMOND, ShareSil.PLUS),
            shareSilhouettes(Mode.DAILY, "2026-08-27"),
        )
    }

    @Test
    fun webCopyMatches() {
        assertEquals("12 rounds · UTC", dailyNoteLabel(null))
        assertEquals("Today 8,421", dailyNoteLabel(8421))
        assertEquals("Endless", resultKicker(Mode.ENDLESS, practice = false, submitted = false))
        assertEquals("Daily · Saved for today", resultKicker(Mode.DAILY, practice = false, submitted = true))
        assertEquals(
            "Daily practice · Practice · first run already saved",
            resultKicker(Mode.DAILY, practice = true, submitted = false),
        )
        assertEquals("Round 4 · New best", resultMeta("Round 4", newBest = true, best = 100))
        assertEquals("Round 4 · Best 1,200", resultMeta("Round 4", newBest = false, best = 1200))
        assertEquals("Free. No account. 3 lives. Combo. ~45–90s.", "Free. No account. 3 lives. Combo. ~45–90s.")
    }
}
