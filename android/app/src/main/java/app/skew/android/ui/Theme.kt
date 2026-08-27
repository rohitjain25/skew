package app.skew.android.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val Bg = Color(0xFF0B0B0C)
val Surface = Color(0xFF161618)
val Text = Color(0xFFF4F1EA)
val Muted = Color(0xFF8A8680)
val Accent = Color(0xFFE8FF47)
val Danger = Color(0xFFFF4D3D)
val Hairline = Color(0x14FFFFFF)

private val SkewColors = darkColorScheme(
    primary = Accent,
    onPrimary = Bg,
    background = Bg,
    onBackground = Text,
    surface = Surface,
    onSurface = Text,
    error = Danger,
)

@Composable
fun SkewTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = SkewColors, content = content)
}

fun hslColor(h: Double, sPercent: Double, lPercent: Double): Color {
    val s = (sPercent / 100.0).coerceIn(0.0, 1.0)
    val l = (lPercent / 100.0).coerceIn(0.0, 1.0)
    val c = (1 - kotlin.math.abs(2 * l - 1)) * s
    val hp = (((h % 360) + 360) % 360) / 60.0
    val x = c * (1 - kotlin.math.abs(hp % 2 - 1))
    val (r1, g1, b1) = when {
        hp < 1 -> Triple(c, x, 0.0)
        hp < 2 -> Triple(x, c, 0.0)
        hp < 3 -> Triple(0.0, c, x)
        hp < 4 -> Triple(0.0, x, c)
        hp < 5 -> Triple(x, 0.0, c)
        else -> Triple(c, 0.0, x)
    }
    val m = l - c / 2
    return Color(
        red = (r1 + m).toFloat().coerceIn(0f, 1f),
        green = (g1 + m).toFloat().coerceIn(0f, 1f),
        blue = (b1 + m).toFloat().coerceIn(0f, 1f),
    )
}
