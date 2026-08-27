package app.skew.android.share

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.net.Uri
import androidx.core.content.FileProvider
import app.skew.android.Config
import app.skew.android.game.dailyPath
import app.skew.android.game.formatScore
import java.io.File
import java.io.FileOutputStream

fun challengeOrigin(fallback: String = Config.SITE_URL): String =
    (Config.SITE_URL.ifBlank { fallback }).trimEnd('/')

fun challengeText(score: Int, dateId: String, origin: String = Config.SITE_URL): String {
    val link = "${challengeOrigin(origin)}${dailyPath(dateId)}"
    return "SKEW — Find the fake. I scored ${formatScore(score)}. Can you beat me?\n$link"
}

fun renderScoreCard(score: Int, roundLabel: String, newBest: Boolean): Bitmap {
    val w = 1080
    val h = 1350
    val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
    val c = Canvas(bmp)
    c.drawColor(0xFF0B0B0C.toInt())
    val text = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFFF4F1EA.toInt()
        textAlign = Paint.Align.CENTER
        typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
        textSize = 72f
        letterSpacing = 0.18f
    }
    c.drawText("SKEW", w / 2f, 220f, text)
    drawBrandBars(c, w / 2f, 340f)
    text.letterSpacing = 0f
    text.textSize = 140f
    c.drawText(formatScore(score), w / 2f, 640f, text)
    text.textSize = 36f
    text.typeface = Typeface.create(Typeface.MONOSPACE, Typeface.NORMAL)
    val stats = if (newBest) "$roundLabel  ·  New best" else roundLabel
    c.drawText(stats, w / 2f, 720f, text)
    text.typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.NORMAL)
    text.color = 0xFF8A8680.toInt()
    text.textSize = 34f
    c.drawText("Can you beat me?", w / 2f, 980f, text)
    val accent = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFE8FF47.toInt() }
    c.drawRect(w / 2f - 48f, 1016f, w / 2f + 48f, 1024f, accent)
    text.color = 0xFFF4F1EA.toInt()
    text.textSize = 28f
    text.typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
    text.letterSpacing = 0.28f
    c.drawText(Config.SHARE_DOMAIN_LOCKUP, w / 2f, 1180f, text)
    return bmp
}

private fun drawBrandBars(c: Canvas, cx: Float, cy: Float) {
    val barW = 28f
    val barH = 72f
    val gap = 22f
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFF4F1EA.toInt() }
    val xs = floatArrayOf(cx - barW * 1.5f - gap, cx - barW / 2f, cx + barW / 2f + gap)
    xs.forEachIndexed { i, x ->
        c.save()
        c.translate(x + barW / 2f, cy)
        if (i == 1) c.rotate(-8f)
        c.drawRoundRect(RectF(-barW / 2f, -barH / 2f, barW / 2f, barH / 2f), 8f, 8f, paint)
        c.restore()
    }
}

fun shareScore(context: Context, score: Int, roundLabel: String, newBest: Boolean, dateId: String) {
    val text = challengeText(score, dateId)
    val bmp = renderScoreCard(score, roundLabel, newBest)
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

fun copyText(context: Context, text: String) {
    val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    cm.setPrimaryClip(ClipData.newPlainText("SKEW", text))
}

fun openUpi(context: Context): Boolean {
    return try {
        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(Config.TIP_UPI_URL)))
        true
    } catch (_: Exception) {
        false
    }
}
