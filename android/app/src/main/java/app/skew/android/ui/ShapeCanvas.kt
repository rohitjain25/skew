package app.skew.android.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.translate
import app.skew.android.game.Family
import app.skew.android.game.ShapeParams
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

@Composable
fun ShapeView(params: ShapeParams, modifier: Modifier = Modifier) {
    Canvas(modifier.fillMaxSize()) {
        val u = min(size.width, size.height) / 100f
        val fill = hslColor(params.fillH, params.fillS, params.fillL)
        val stroke = if (params.strokeOn) {
            hslColor(params.fillH, minOf(params.fillS, 24.0), maxOf(18.0, params.fillL - 28))
        } else Color.Transparent
        val sw = if (params.strokeOn) params.strokeW.toFloat() * u else 0f
        translate((50f + params.offsetX.toFloat()) * u, (50f + params.offsetY.toFloat()) * u) {
            rotate(params.rotation.toFloat()) {
                scale(
                    scaleX = (params.scale * if (params.mirror) -1.0 else 1.0).toFloat(),
                    scaleY = params.scale.toFloat(),
                ) {
                    drawFamily(params, fill, stroke, sw, u)
                    if (params.micro) {
                        val r = params.microSize.toFloat() * u
                        drawRoundRect(
                            color = fill,
                            topLeft = Offset(18f * u - r / 2f, -24f * u - r / 2f),
                            size = Size(r, r),
                            cornerRadius = androidx.compose.ui.geometry.CornerRadius(min(2f * u, r / 3f)),
                        )
                    }
                }
            }
        }
    }
}

private fun DrawScope.drawFamily(
    p: ShapeParams,
    fill: Color,
    stroke: Color,
    sw: Float,
    u: Float,
) {
    val strokeStyle = Stroke(width = sw, cap = StrokeCap.Round, join = StrokeJoin.Round)
    when (p.family) {
        Family.CARD -> {
            drawRoundRect(fill, Offset(-16f * u, -26f * u), Size(32f * u, 52f * u), androidx.compose.ui.geometry.CornerRadius(6f * u))
            if (sw > 0) drawRoundRect(stroke, Offset(-16f * u, -26f * u), Size(32f * u, 52f * u), androidx.compose.ui.geometry.CornerRadius(6f * u), style = strokeStyle)
        }
        Family.CIRCLE -> {
            drawCircle(fill, 26f * u)
            if (sw > 0) drawCircle(stroke, 26f * u, style = strokeStyle)
            for (i in 0 until p.count) {
                val a = -PI / 2 + (i * 2 * PI) / p.count
                drawCircle(Color(0xFF0B0B0C), 3.2f * u, Offset((cos(a) * 14).toFloat() * u, (sin(a) * 14).toFloat() * u))
            }
        }
        Family.TRIANGLE -> poly(fill, stroke, sw, listOf(0f to -26f, 24f to 22f, -24f to 22f), u)
        Family.DIAMOND -> poly(fill, stroke, sw, listOf(0f to -28f, 22f to 0f, 0f to 28f, -22f to 0f), u)
        Family.HEXAGON -> regular(fill, stroke, sw, 6, 26f, u)
        Family.STAR -> star(fill, stroke, sw, 28f, 12f, u)
        Family.PLUS -> {
            val path = Path().apply {
                moveTo(-8f * u, -26f * u)
                lineTo(8f * u, -26f * u)
                lineTo(8f * u, -8f * u)
                lineTo(26f * u, -8f * u)
                lineTo(26f * u, 8f * u)
                lineTo(8f * u, 8f * u)
                lineTo(8f * u, 26f * u)
                lineTo(-8f * u, 26f * u)
                lineTo(-8f * u, 8f * u)
                lineTo(-26f * u, 8f * u)
                lineTo(-26f * u, -8f * u)
                lineTo(-8f * u, -8f * u)
                close()
            }
            drawPath(path, fill)
            if (sw > 0) drawPath(path, stroke, style = strokeStyle)
        }
        Family.RING -> drawCircle(fill, 22f * u, style = Stroke(width = max(sw, 7f * u), cap = StrokeCap.Round))
        Family.CAPSULE -> {
            drawRoundRect(fill, Offset(-12f * u, -26f * u), Size(24f * u, 52f * u), androidx.compose.ui.geometry.CornerRadius(12f * u))
            if (sw > 0) drawRoundRect(stroke, Offset(-12f * u, -26f * u), Size(24f * u, 52f * u), androidx.compose.ui.geometry.CornerRadius(12f * u), style = strokeStyle)
        }
        Family.CHEVRON -> {
            val path = Path().apply {
                moveTo(-14f * u, -22f * u)
                lineTo(16f * u, 0f)
                lineTo(-14f * u, 22f * u)
            }
            drawPath(path, fill, style = Stroke(width = max(sw, 6f * u), cap = StrokeCap.Round, join = StrokeJoin.Round))
        }
        Family.ARC -> {
            val path = Path().apply {
                arcTo(Rect(Offset(-26f * u, -26f * u), Size(52f * u, 52f * u)), -40f, 260f, false)
            }
            drawPath(path, fill, style = Stroke(width = max(sw, 7f * u), cap = StrokeCap.Round))
        }
        Family.BARS -> {
            val n = max(2, p.count)
            val w = 8f * u
            val gap = 6f * u
            val total = n * w + (n - 1) * gap
            val x0 = -total / 2
            for (i in 0 until n) {
                val x = x0 + i * (w + gap)
                drawRoundRect(fill, Offset(x, -24f * u), Size(w, 48f * u), androidx.compose.ui.geometry.CornerRadius(3f * u))
                if (sw > 0) drawRoundRect(stroke, Offset(x, -24f * u), Size(w, 48f * u), androidx.compose.ui.geometry.CornerRadius(3f * u), style = strokeStyle)
            }
        }
        Family.DOTS -> {
            val n = max(2, p.count)
            for (i in 0 until n) {
                val a = -PI / 2 + (i * 2 * PI) / n
                drawCircle(fill, 5.5f * u, Offset((cos(a) * 18).toFloat() * u, (sin(a) * 18).toFloat() * u))
            }
        }
        Family.SLASH -> {
            val path = Path().apply {
                moveTo(-18f * u, 20f * u)
                lineTo(18f * u, -20f * u)
            }
            drawPath(path, fill, style = Stroke(width = max(sw, 7f * u), cap = StrokeCap.Round))
        }
        Family.FRAME -> {
            drawRoundRect(
                color = fill,
                topLeft = Offset(-22f * u, -22f * u),
                size = Size(44f * u, 44f * u),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(4f * u),
                style = Stroke(width = max(sw, 5f * u)),
            )
        }
        Family.PENTAGON -> regular(fill, stroke, sw, 5, 26f, u)
    }
}

private fun DrawScope.poly(fill: Color, stroke: Color, sw: Float, pts: List<Pair<Float, Float>>, u: Float) {
    val path = Path().apply {
        moveTo(pts[0].first * u, pts[0].second * u)
        for (i in 1 until pts.size) lineTo(pts[i].first * u, pts[i].second * u)
        close()
    }
    drawPath(path, fill)
    if (sw > 0) drawPath(path, stroke, style = Stroke(width = sw, join = StrokeJoin.Round, cap = StrokeCap.Round))
}

private fun DrawScope.regular(fill: Color, stroke: Color, sw: Float, n: Int, r: Float, u: Float) {
    val pts = (0 until n).map { i ->
        val a = -PI / 2 + (i * 2 * PI) / n
        (cos(a) * r).toFloat() to (sin(a) * r).toFloat()
    }
    poly(fill, stroke, sw, pts, u)
}

private fun DrawScope.star(fill: Color, stroke: Color, sw: Float, outer: Float, inner: Float, u: Float) {
    val pts = (0 until 10).map { i ->
        val rad = if (i % 2 == 0) outer else inner
        val a = -PI / 2 + (i * PI) / 5
        (cos(a) * rad).toFloat() to (sin(a) * rad).toFloat()
    }
    poly(fill, stroke, sw, pts, u)
}
