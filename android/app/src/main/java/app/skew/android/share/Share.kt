package app.skew.android.share

import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Typeface
import android.net.Uri
import androidx.core.content.FileProvider
import app.skew.android.Config
import app.skew.android.game.Mode
import app.skew.android.game.Rng
import app.skew.android.game.dailyPath
import app.skew.android.game.formatScore
import app.skew.android.game.hashString
import java.io.File
import java.io.FileOutputStream

enum class ShareSil { CIRCLE, TRIANGLE, DIAMOND, BARS, SLASH, CHEVRON, CAPSULE, PLUS }

private val SHARE_SILS = listOf(
    ShareSil.CIRCLE, ShareSil.TRIANGLE, ShareSil.DIAMOND, ShareSil.BARS,
    ShareSil.SLASH, ShareSil.CHEVRON, ShareSil.CAPSULE, ShareSil.PLUS,
)

fun shareLockup(siteUrl: String = Config.SITE_URL): String {
    val raw = siteUrl.trimEnd('/')
    return raw.removePrefix("https://").removePrefix("http://").substringBefore('/')
}

fun challengeOrigin(fallback: String = Config.SITE_URL): String =
    (Config.SITE_URL.ifBlank { fallback }).trimEnd('/')

fun challengeText(score: Int, dateId: String, origin: String = Config.SITE_URL): String {
    val link = "${challengeOrigin(origin)}${dailyPath(dateId)}"
    return "SKEW — Find the fake. I scored ${formatScore(score)}. Can you beat me?\n$link"
}

fun shareSilhouetteKey(mode: Mode, dateId: String): String =
    if (mode == Mode.DAILY) "daily:$dateId" else "endless"

fun shareSilhouettes(mode: Mode, dateId: String): List<ShareSil> {
    val seed = hashString("${Config.SHARE_SIL_VERSION}:${shareSilhouetteKey(mode, dateId)}")
    val rng = Rng(seed)
    return listOf(rng.pick(SHARE_SILS), rng.pick(SHARE_SILS), rng.pick(SHARE_SILS))
}

fun cardDateLine(mode: Mode, dateId: String): String? =
    if (mode == Mode.DAILY && dateId.isNotEmpty()) "$dateId UTC" else null

fun cardMetaLine(roundLabel: String, newBest: Boolean): String =
    if (newBest) "$roundLabel  ·  New best" else roundLabel

fun renderScoreCard(
    score: Int,
    roundLabel: String,
    newBest: Boolean,
    dateId: String,
    mode: Mode,
): Bitmap {
    val w = 1080
    val h = 1350
    val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
    val c = Canvas(bmp)
    c.drawColor(0xFF0B0B0C.toInt())
    val text = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFFF4F1EA.toInt()
        textAlign = Paint.Align.CENTER
        typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
        textSize = 64f
        letterSpacing = 0.16f
    }
    c.drawText("SKEW", w / 2f, 150f, text)
    drawBrandBars(c, w / 2f, 230f)
    drawSilBoard(c, w / 2f, 520f, shareSilhouettes(mode, dateId))
    text.letterSpacing = 0f
    text.textSize = 128f
    c.drawText(formatScore(score), w / 2f, 820f, text)
    text.textSize = 34f
    text.typeface = Typeface.create(Typeface.MONOSPACE, Typeface.NORMAL)
    c.drawText(cardMetaLine(roundLabel, newBest), w / 2f, 880f, text)
    val dateLine = cardDateLine(mode, dateId)
    if (dateLine != null) {
        text.color = 0xFF8A8680.toInt()
        text.textSize = 28f
        c.drawText(dateLine, w / 2f, 928f, text)
    }
    text.typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.NORMAL)
    text.color = 0xFF8A8680.toInt()
    text.textSize = 34f
    c.drawText("Can you beat me?", w / 2f, 1040f, text)
    val accent = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFE8FF47.toInt() }
    c.drawRect(w / 2f - 48f, 1076f, w / 2f + 48f, 1084f, accent)
    text.color = 0xFFF4F1EA.toInt()
    text.textSize = 26f
    text.typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
    text.letterSpacing = 0.02f
    c.drawText(shareLockup(), w / 2f, 1188f, text)
    return bmp
}

private fun drawSilBoard(c: Canvas, cx: Float, cy: Float, sils: List<ShareSil>) {
    val cardW = 220f
    val cardH = 300f
    val gap = 28f
    val total = cardW * 3 + gap * 2
    var x = cx - total / 2
    val surface = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFF161618.toInt() }
    val glyph = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFFF4F1EA.toInt()
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
        style = Paint.Style.FILL
    }
    for (kind in sils) {
        c.drawRoundRect(RectF(x, cy - cardH / 2, x + cardW, cy + cardH / 2), 28f, 28f, surface)
        c.save()
        c.translate(x + cardW / 2, cy)
        drawSil(c, kind, glyph)
        c.restore()
        x += cardW + gap
    }
}

private fun drawSil(c: Canvas, kind: ShareSil, paint: Paint) {
    val fill = Paint(paint).apply { style = Paint.Style.FILL }
    val stroke = Paint(paint).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
    }
    when (kind) {
        ShareSil.CIRCLE -> c.drawCircle(0f, 0f, 58f, fill)
        ShareSil.TRIANGLE -> {
            val p = Path()
            p.moveTo(0f, -64f)
            p.lineTo(58f, 52f)
            p.lineTo(-58f, 52f)
            p.close()
            c.drawPath(p, fill)
        }
        ShareSil.DIAMOND -> {
            val p = Path()
            p.moveTo(0f, -64f)
            p.lineTo(54f, 0f)
            p.lineTo(0f, 64f)
            p.lineTo(-54f, 0f)
            p.close()
            c.drawPath(p, fill)
        }
        ShareSil.BARS -> {
            for (bx in floatArrayOf(-48f, -12f, 24f)) {
                c.drawRoundRect(RectF(bx, -56f, bx + 22f, 56f), 8f, 8f, fill)
            }
        }
        ShareSil.SLASH -> {
            stroke.strokeWidth = 22f
            c.drawLine(-44f, 48f, 44f, -48f, stroke)
        }
        ShareSil.CHEVRON -> {
            stroke.strokeWidth = 18f
            val p = Path()
            p.moveTo(-42f, -44f)
            p.lineTo(38f, 0f)
            p.lineTo(-42f, 44f)
            c.drawPath(p, stroke)
        }
        ShareSil.CAPSULE -> c.drawRoundRect(RectF(-28f, -64f, 28f, 64f), 28f, 28f, fill)
        ShareSil.PLUS -> {
            val p = Path()
            p.moveTo(-18f, -60f)
            p.lineTo(18f, -60f)
            p.lineTo(18f, -18f)
            p.lineTo(60f, -18f)
            p.lineTo(60f, 18f)
            p.lineTo(18f, 18f)
            p.lineTo(18f, 60f)
            p.lineTo(-18f, 60f)
            p.lineTo(-18f, 18f)
            p.lineTo(-60f, 18f)
            p.lineTo(-60f, -18f)
            p.lineTo(-18f, -18f)
            p.close()
            c.drawPath(p, fill)
        }
    }
}

private fun drawBrandBars(c: Canvas, cx: Float, cy: Float) {
    val barW = 22f
    val barH = 56f
    val gap = 16f
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFF4F1EA.toInt() }
    val xs = floatArrayOf(cx - barW * 1.5f - gap, cx - barW / 2f, cx + barW / 2f + gap)
    xs.forEachIndexed { i, x ->
        c.save()
        c.translate(x + barW / 2f, cy)
        if (i == 1) c.rotate(-8f)
        c.drawRoundRect(RectF(-barW / 2f, -barH / 2f, barW / 2f, barH / 2f), 7f, 7f, paint)
        c.restore()
    }
}

fun shareScore(
    context: Context,
    score: Int,
    roundLabel: String,
    newBest: Boolean,
    dateId: String,
    mode: Mode,
) {
    val text = challengeText(score, dateId)
    val bmp = renderScoreCard(score, roundLabel, newBest, dateId, mode)
    val dir = File(context.cacheDir, "share").apply { mkdirs() }
    val file = File(dir, "skew-score.png")
    FileOutputStream(file).use { bmp.compress(Bitmap.CompressFormat.PNG, 100, it) }
    val uri: Uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "image/png"
        putExtra(Intent.EXTRA_TEXT, text)
        putExtra(Intent.EXTRA_STREAM, uri)
        clipData = ClipData.newUri(context.contentResolver, "SKEW", uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    context.startActivity(Intent.createChooser(intent, "SKEW"))
}

fun shareChallenge(context: Context, score: Int, dateId: String) {
    val text = challengeText(score, dateId)
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, text)
        putExtra(Intent.EXTRA_SUBJECT, "SKEW")
    }
    context.startActivity(Intent.createChooser(intent, "SKEW"))
}
