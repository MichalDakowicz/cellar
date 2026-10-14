package expo.modules.cellarcapture

import android.content.Intent
import android.content.pm.ApplicationInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.os.Looper
import android.util.Base64
import androidx.core.os.bundleOf
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.security.MessageDigest
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

class CellarCaptureModule : Module() {
  private var shared: String? = null
  private var previous: Thread.UncaughtExceptionHandler? = null
  private var handler: Thread.UncaughtExceptionHandler? = null
  private fun debug(): Boolean = appContext.reactContext?.applicationInfo?.flags?.and(ApplicationInfo.FLAG_DEBUGGABLE) != 0 && appContext.reactContext != null
  private fun prefs() = appContext.reactContext!!.getSharedPreferences("cellar-debug-crashes", 0)
  private fun sharedText(intent: Intent?): String? {
    if (intent?.action != Intent.ACTION_SEND || intent.type?.startsWith("text/") != true) return null
    return intent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString()?.trim()?.take(8000)?.takeIf { it.isNotBlank() }
  }
  override fun definition() = ModuleDefinition {
    Name("CellarCapture")
    Events("onSharedText")
    OnCreate {
      if (debug()) {
        previous = Thread.getDefaultUncaughtExceptionHandler()
        handler = Thread.UncaughtExceptionHandler { thread, error ->
          try { record(error.stackTraceToString()) } catch (_: Throwable) {}
          previous?.uncaughtException(thread, error)
        }
        Thread.setDefaultUncaughtExceptionHandler(handler)
      }
    }
    OnDestroy { if (handler != null && Thread.getDefaultUncaughtExceptionHandler() === handler) Thread.setDefaultUncaughtExceptionHandler(previous) }
    Function("getSharedText") { shared ?: sharedText(appContext.currentActivity?.intent).also { shared = it } }
    Function("clearSharedText") { shared = null; appContext.currentActivity?.intent?.removeExtra(Intent.EXTRA_TEXT) }
    OnNewIntent { intent -> sharedText(intent)?.let { shared = it; sendEvent("onSharedText", bundleOf("text" to it)) } }
    Function("recordCrash") { stack: String -> if (debug()) record(stack) }
    Function("setCaptureOwner") { owner: String? -> if (debug()) prefs().edit().putString("owner", owner).commit(); Unit }
    Function("getCrashes") { if (debug()) prefs().getString("reports", "[]") else "[]" }
    Function("dismissCrash") { signature: String ->
      if (debug()) synchronized(this@CellarCaptureModule) {
        val reports = JSONArray(prefs().getString("reports", "[]")); val kept = JSONArray()
        for (i in 0 until reports.length()) if (reports.getJSONObject(i).getString("signature") != signature) kept.put(reports.get(i))
        prefs().edit().putString("reports", kept.toString()).commit()
      }
    }
  }
  private fun redact(value: String): String = value
    .replace(Regex("(?i)(authorization)\\s*[:=]\\s*(?:Bearer\\s+)?[^\\s,]+"), "$1=[redacted]")
    .replace(Regex("(?i)(authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret)\\s*[:=]\\s*[^\\s,]+"), "$1=[redacted]")
    .replace(Regex("\\b(?:sk-|eyJ)[A-Za-z0-9_.-]{12,}"), "[redacted]")
    .take(32000)

  private fun screenshot(): JSONObject? {
    val activity = appContext.currentActivity ?: return null
    var result: JSONObject? = null; val latch = CountDownLatch(1)
    val draw = Runnable {
      try {
        val view = activity.window.decorView
        if (view.width > 0 && view.height > 0) {
          val scale = minOf(1f, 640f / maxOf(view.width, view.height))
          val bitmap = Bitmap.createBitmap((view.width * scale).toInt().coerceAtLeast(1), (view.height * scale).toInt().coerceAtLeast(1), Bitmap.Config.ARGB_8888)
          val canvas = Canvas(bitmap); canvas.scale(scale, scale); view.draw(canvas)
          val bytes = ByteArrayOutputStream(); bitmap.compress(Bitmap.CompressFormat.JPEG, 55, bytes)
          val data = "data:image/jpeg;base64," + Base64.encodeToString(bytes.toByteArray(), Base64.NO_WRAP)
          val thumbScale = minOf(1f, 160f / maxOf(bitmap.width, bitmap.height))
          val thumb = Bitmap.createScaledBitmap(bitmap, (bitmap.width * thumbScale).toInt().coerceAtLeast(1), (bitmap.height * thumbScale).toInt().coerceAtLeast(1), true)
          val thumbBytes = ByteArrayOutputStream(); thumb.compress(Bitmap.CompressFormat.JPEG, 55, thumbBytes)
          result = JSONObject().put("width", bitmap.width).put("height", bitmap.height).put("data", data).put("thumb", "data:image/jpeg;base64," + Base64.encodeToString(thumbBytes.toByteArray(), Base64.NO_WRAP))
          if (thumb !== bitmap) thumb.recycle(); bitmap.recycle()
        }
      } catch (_: Throwable) {} finally { latch.countDown() }
    }
    if (Looper.myLooper() == Looper.getMainLooper()) draw.run() else { activity.runOnUiThread(draw); latch.await(300, TimeUnit.MILLISECONDS) }
    return result
  }
  @Synchronized private fun record(raw: String) {
    val stack = redact(raw)
    val owner = prefs().getString("owner", null) ?: return
    val signature = MessageDigest.getInstance("SHA-256").digest((owner + stack.replace(Regex("0x[0-9a-fA-F]+"), "0x")).toByteArray()).joinToString("") { "%02x".format(it) }
    val count = prefs().getInt("count:$signature", 0) + 1
    prefs().edit().putInt("count:$signature", count).commit()
    val reports = JSONArray(prefs().getString("reports", "[]")); var existing: JSONObject? = null
    for (i in 0 until reports.length()) if (reports.getJSONObject(i).getString("signature") == signature) existing = reports.getJSONObject(i)
    if (existing != null) { existing.put("count", count).put("at", System.currentTimeMillis()) }
    else {
      var log = "log unavailable"
      try {
        val process = ProcessBuilder("logcat", "-d", "-t", "200", "--pid=${android.os.Process.myPid()}").redirectErrorStream(true).start()
        if (process.waitFor(1, TimeUnit.SECONDS)) log = redact(process.inputStream.bufferedReader().readText().take(32000)) else process.destroy()
      } catch (_: Throwable) {}
      val report = JSONObject().put("owner", owner).put("signature", signature).put("stack", stack).put("log", log).put("at", System.currentTimeMillis()).put("count", count)
      screenshot()?.let { report.put("picture", it) }
      reports.put(report)
    }
    val kept = JSONArray(); for (i in maxOf(0, reports.length() - 10) until reports.length()) kept.put(reports.get(i))
    prefs().edit().putString("reports", kept.toString()).commit()
  }
}
