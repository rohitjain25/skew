package app.skew.android

import android.os.Bundle
import android.os.SystemClock
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.getSystemService
import app.skew.android.game.Engine
import app.skew.android.game.Mode
import app.skew.android.game.RunSnapshot
import app.skew.android.game.Verdict
import app.skew.android.game.dailySeed
import app.skew.android.game.formatCountdown
import app.skew.android.game.msUntilNextUtcMidnight
import app.skew.android.game.randomSeed
import app.skew.android.game.utcDateId
import app.skew.android.share.copyText
import app.skew.android.share.openUpi
import app.skew.android.share.shareChallenge
import app.skew.android.share.shareScore
import app.skew.android.storage.RecordResult
import app.skew.android.storage.SkewStore
import app.skew.android.ui.GameScreen
import app.skew.android.ui.LandingScreen
import app.skew.android.ui.ResultsScreen
import app.skew.android.ui.SkewTheme
import kotlinx.coroutines.delay

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val store = SkewStore(this)
        setContent { SkewTheme { SkewApp(store) } }
    }
}

private sealed class Screen {
    data object Landing : Screen()
    data class Playing(val engine: Engine) : Screen()
    data class Results(
        val snap: RunSnapshot,
        val rec: RecordResult,
        val roundLabel: String,
        val dateId: String,
    ) : Screen()
}

@androidx.compose.runtime.Composable
private fun SkewApp(store: SkewStore) {
    val context = LocalContext.current
    var screen by remember { mutableStateOf<Screen>(Screen.Landing) }
    var remaining by remember { mutableStateOf(0.0) }
    var flashIndex by remember { mutableStateOf<Int?>(null) }
    var flashHit by remember { mutableStateOf<Boolean?>(null) }
    var tick by remember { mutableStateOf(0) }

    fun now() = SystemClock.elapsedRealtime().toDouble()

    fun roundLabel(snap: RunSnapshot): String {
        val n = if (snap.ended.name == "COMPLETE") {
            if (snap.mode == Mode.DAILY) Config.DAILY_ROUNDS else snap.roundIndex
        } else snap.roundIndex + 1
        return "Round $n"
    }

    fun start(mode: Mode, practice: Boolean = false) {
        val dateId = utcDateId()
        val seed = if (mode == Mode.DAILY) dailySeed(dateId, Config.DAILY_SEED_VERSION) else randomSeed()
        val already = mode == Mode.DAILY && store.getDailySubmit(dateId) != null
        val engine = Engine(mode, seed, if (mode == Mode.DAILY) dateId else null, practice || already)
        engine.start(now())
        flashIndex = null
        flashHit = null
        remaining = engine.current.durationMs.toDouble()
        screen = Screen.Playing(engine)
    }

    fun buzz(hit: Boolean) {
        val v = context.getSystemService<Vibrator>() ?: return
        if (hit) v.vibrate(VibrationEffect.createOneShot(12, VibrationEffect.DEFAULT_AMPLITUDE))
        else v.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 30, 40, 30), -1))
    }

    val playing = screen as? Screen.Playing
    LaunchedEffect(playing?.engine, tick) {
        val engine = playing?.engine ?: return@LaunchedEffect
        if (engine.over || engine.locked) return@LaunchedEffect
        while (!engine.over && !engine.locked) {
            remaining = engine.remaining(now())
            if (remaining <= 0.0) {
                val result = engine.timeout(now()) ?: return@LaunchedEffect
                flashIndex = engine.current.oddIndex
                flashHit = false
                buzz(false)
                return@LaunchedEffect
            }
            delay(16)
        }
    }

    when (val s = screen) {
        Screen.Landing -> LandingScreen(
            dailyNote = store.dailyNote(),
            resetLabel = formatCountdown(msUntilNextUtcMidnight()),
            onPlay = { start(Mode.ENDLESS) },
            onDaily = { start(Mode.DAILY) },
        )
        is Screen.Playing -> GameScreen(
            engine = s.engine,
            remainingMs = remaining,
            flashIndex = flashIndex,
            flashHit = flashHit,
            onTap = { index ->
                val engine = s.engine
                val result = engine.tap(index, now()) ?: return@GameScreen
                flashIndex = index
                flashHit = result.verdict == Verdict.HIT
                buzz(result.verdict == Verdict.HIT)
                // settle on next frame via tick after delay
            },
        )
        is Screen.Results -> ResultsScreen(
            snap = s.snap,
            best = s.rec.best,
            newBest = s.rec.newBest,
            submitted = s.rec.submitted,
            roundLabel = s.roundLabel,
            onShare = {
                shareScore(context, s.snap.score, s.roundLabel, s.rec.newBest, s.dateId)
            },
            onChallenge = {
                shareChallenge(context, s.snap.score, s.dateId)
            },
            onAgain = { start(s.snap.mode, s.snap.mode == Mode.DAILY) },
            onHome = { screen = Screen.Landing },
            onTip = { openUpi(context) },
            onCopyVpa = { copyText(context, Config.TIP_VPA) },
        )
    }

    val playingTap = screen as? Screen.Playing
    LaunchedEffect(flashIndex, flashHit, playingTap?.engine) {
        val engine = playingTap?.engine ?: return@LaunchedEffect
        if (flashIndex == null) return@LaunchedEffect
        val gameOver = engine.over
        delay(if (gameOver) 640 else 280)
        if (gameOver || !engine.advance(now())) {
            val snap = engine.snapshot()
            val rec = store.recordRun(snap)
            screen = Screen.Results(snap, rec, roundLabel(snap), snap.date ?: utcDateId())
        } else {
            flashIndex = null
            flashHit = null
            remaining = engine.current.durationMs.toDouble()
            tick++
        }
    }
}
