package app.skew.android.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.skew.android.Config
import app.skew.android.game.Engine
import app.skew.android.game.Mode
import app.skew.android.game.RunSnapshot
import app.skew.android.game.formatScore
import app.skew.android.resultKicker
import app.skew.android.resultMeta

@Composable
fun LogoBars(modifier: Modifier = Modifier) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Bar()
        Bar(modifier = Modifier.rotate(-8f))
        Bar()
    }
}

@Composable
private fun Bar(modifier: Modifier = Modifier) {
    Box(
        modifier
            .width(28.dp)
            .height(52.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(Text),
    )
}

@Composable
fun LandingScreen(
    dailyNote: String,
    resetLabel: String,
    onPlay: () -> Unit,
    onDaily: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Bg)
            .systemBarsPadding()
            .padding(horizontal = 20.dp, vertical = 28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        LogoBars(Modifier.padding(bottom = 18.dp))
        Text(
            text = "SKEW",
            color = Text,
            fontSize = 48.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 16.sp,
        )
        Spacer(Modifier.height(14.dp))
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Row(verticalAlignment = Alignment.Bottom) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Find", color = Muted, fontSize = 18.sp)
                    Box(
                        Modifier
                            .padding(top = 4.dp)
                            .width(42.dp)
                            .height(4.dp)
                            .background(Accent),
                    )
                }
                Text(" the fake.", color = Muted, fontSize = 18.sp)
            }
        }
        Spacer(Modifier.height(36.dp))
        Column(Modifier.widthIn(max = 360.dp).fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(Accent)
                    .clickable(onClick = onPlay),
                contentAlignment = Alignment.Center,
            ) {
                Text("Play", color = Bg, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
            }
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(Surface)
                    .border(1.dp, Hairline, RoundedCornerShape(10.dp))
                    .clickable(onClick = onDaily),
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Daily", color = Text, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
                    Text(dailyNote, color = Muted, fontSize = 12.sp, fontFamily = FontFamily.Monospace)
                }
            }
        }
        Text(
            "Free. No account. 3 lives. Combo. ~45–90s.",
            color = Muted,
            fontSize = 13.sp,
            modifier = Modifier.padding(top = 22.dp),
            textAlign = TextAlign.Center,
        )
        Text(
            "Daily resets in $resetLabel",
            color = Muted,
            fontSize = 13.sp,
            modifier = Modifier.padding(top = 6.dp),
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
fun GameScreen(
    engine: Engine,
    remainingMs: Double,
    flashIndex: Int?,
    flashHit: Boolean?,
    onTap: (Int) -> Unit,
) {
    val frac = (remainingMs / engine.current.durationMs).toFloat().coerceIn(0f, 1f)
    val urgent = frac < 0.22f
    val modeLabel =
        if (engine.mode == Mode.DAILY) "Daily ${engine.roundIndex + 1}/${Config.DAILY_ROUNDS}"
        else "Round ${engine.roundIndex + 1}"
    Column(
        Modifier
            .fillMaxSize()
            .background(Bg)
            .systemBarsPadding()
            .padding(horizontal = 20.dp, vertical = 20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Row(
            Modifier.fillMaxWidth().widthIn(max = 560.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                repeat(Config.LIVES) { i ->
                    Box(
                        Modifier
                            .width(18.dp)
                            .height(8.dp)
                            .then(
                                if (i < engine.lives) Modifier.clip(RoundedCornerShape(2.dp)).background(Text)
                                else Modifier.border(1.dp, Muted, RoundedCornerShape(2.dp)),
                            ),
                    )
                }
            }
            Text(formatScore(engine.score), color = Text, fontSize = 18.sp, fontFamily = FontFamily.Monospace)
        }
        Spacer(Modifier.height(10.dp))
        Box(
            Modifier
                .fillMaxWidth()
                .widthIn(max = 560.dp)
                .height(3.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(Color(0x12FFFFFF)),
        ) {
            Box(
                Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(frac)
                    .background(if (urgent) Danger else Accent),
            )
        }
        Text(modeLabel, color = Muted, fontSize = 12.sp, fontFamily = FontFamily.Monospace, modifier = Modifier.padding(top = 8.dp))
        Text(
            if (engine.combo >= 2) "×${engine.combo}" else "×",
            color = if (engine.combo >= 2) Accent else Color.Transparent,
            fontSize = 14.sp,
            fontFamily = FontFamily.Monospace,
            letterSpacing = 1.sp,
            modifier = Modifier.height(24.dp),
        )
        Row(
            Modifier
                .fillMaxWidth()
                .widthIn(max = 560.dp)
                .weight(1f),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            engine.current.items.forEachIndexed { i, item ->
                val inset = when {
                    flashHit == true && flashIndex == i -> Accent
                    flashHit == false && i == engine.current.oddIndex -> Accent
                    flashIndex == i && flashHit == false -> Danger
                    else -> Hairline
                }
                Box(
                    Modifier
                        .weight(1f)
                        .aspectRatio(3f / 4.2f)
                        .clip(RoundedCornerShape(16.dp))
                        .background(Surface)
                        .border(2.dp, inset, RoundedCornerShape(16.dp))
                        .clickable(enabled = flashIndex == null) { onTap(i) }
                        .padding(8.dp),
                ) {
                    ShapeView(item, Modifier.fillMaxSize())
                }
            }
        }
    }
}

@Composable
fun ResultsScreen(
    snap: RunSnapshot,
    best: Int,
    newBest: Boolean,
    submitted: Boolean,
    roundLabel: String,
    onShare: () -> Unit,
    onChallenge: () -> Unit,
    onAgain: () -> Unit,
    onHome: () -> Unit,
    onTip: () -> Unit,
    onCopyVpa: () -> Unit,
) {
    val kicker = resultKicker(snap.mode, snap.practice, submitted)
    val meta = resultMeta(roundLabel, newBest, best)
    Column(
        Modifier
            .fillMaxSize()
            .background(Bg)
            .systemBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Column(
            Modifier
                .widthIn(max = 360.dp)
                .fillMaxWidth()
                .border(1.dp, Color(0x10FFFFFF), RoundedCornerShape(8.dp))
                .padding(horizontal = 20.dp, vertical = 36.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text("SKEW", color = Text, fontSize = 15.sp, fontWeight = FontWeight.Bold, letterSpacing = 8.sp)
            Spacer(Modifier.height(18.dp))
            LogoBars(Modifier)
            Text(
                formatScore(snap.score),
                color = Text,
                fontSize = 64.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(top = 28.dp),
            )
            Text(meta, color = Text, fontSize = 13.sp, fontFamily = FontFamily.Monospace)
            Text("Can you beat me?", color = Muted, fontSize = 15.sp, modifier = Modifier.padding(top = 48.dp))
            Box(Modifier.padding(top = 14.dp).width(48.dp).height(3.dp).background(Accent))
            Text(
                Config.SHARE_DOMAIN_LOCKUP,
                color = Text,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 4.sp,
                modifier = Modifier.padding(top = 28.dp),
            )
        }
        Text(
            kicker,
            color = Muted,
            fontSize = 13.sp,
            fontFamily = FontFamily.Monospace,
            modifier = Modifier.padding(top = 16.dp),
        )
        Spacer(Modifier.height(16.dp))
        Column(Modifier.widthIn(max = 360.dp).fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Action("Share card", Accent, Bg, onShare)
            Action("Challenge a friend", Surface, Text, onChallenge, outlined = true)
            Action("Play again", Surface, Text, onAgain, outlined = true)
            Box(
                Modifier.fillMaxWidth().height(44.dp).clickable(onClick = onHome),
                contentAlignment = Alignment.Center,
            ) {
                Text("Home", color = Muted, fontSize = 16.sp)
            }
        }
        Text(
            "If this ate a minute, send ${Config.TIP_AMOUNT_LABEL}.",
            color = Muted,
            fontSize = 14.sp,
            textDecoration = TextDecoration.Underline,
            modifier = Modifier.padding(top = 16.dp).clickable(onClick = onTip),
        )
        Text(
            "If UPI did not open, copy the VPA.",
            color = Muted,
            fontSize = 12.sp,
            modifier = Modifier.padding(top = 8.dp),
        )
        Text(Config.TIP_VPA, color = Text, fontSize = 13.sp, fontFamily = FontFamily.Monospace)
        Box(
            Modifier
                .padding(top = 8.dp)
                .clip(RoundedCornerShape(8.dp))
                .border(1.dp, Color(0x22FFFFFF), RoundedCornerShape(8.dp))
                .background(Surface)
                .clickable(onClick = onCopyVpa)
                .padding(horizontal = 12.dp, vertical = 10.dp),
        ) {
            Text("Copy", color = Text, fontSize = 13.sp)
        }
    }
}

@Composable
private fun Action(label: String, bg: Color, fg: Color, onClick: () -> Unit, outlined: Boolean = false) {
    Box(
        Modifier
            .fillMaxWidth()
            .height(56.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(bg)
            .then(if (outlined) Modifier.border(1.dp, Hairline, RoundedCornerShape(10.dp)) else Modifier)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, color = fg, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
    }
}
