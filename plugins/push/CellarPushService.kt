package com.michaldakowicz.cellar

import android.content.Context
import android.app.NotificationManager
import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import expo.modules.notifications.service.delegates.ExpoPresentationDelegate
import kotlinx.coroutines.runBlocking
import expo.modules.notifications.service.delegates.FirebaseMessagingDelegate
import expo.modules.notifications.notifications.model.Notification
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

internal object CellarPush {
  val io = Executors.newSingleThreadExecutor()
  private fun prefs(context: Context) = context.getSharedPreferences("cellar-push", Context.MODE_PRIVATE)
  fun configure(context: Context, endpoint: String, device: String, secret: String, owner: String) {
    require(endpoint.startsWith("https://") && endpoint.endsWith("/functions/v1/desk-push"))
    prefs(context).edit().putString("endpoint", endpoint).putString("device", device).putString("secret", secret).putString("owner", owner).commit()
  }
  private fun credentials(context: Context): JSONObject {
    val p = prefs(context)
    return JSONObject().put("endpoint", p.getString("endpoint", "")).put("device", p.getString("device", "")).put("secret", p.getString("secret", "")).put("owner", p.getString("owner", ""))
  }
  fun call(context: Context, body: JSONObject, config: JSONObject = credentials(context)): JSONObject? {
    val endpoint = config.optString("endpoint")
    if (endpoint.isEmpty()) return null
    body.put("deviceId", config.getString("device")).put("secret", config.getString("secret"))
    val connection = URL(endpoint).openConnection() as HttpURLConnection
    try {
      connection.requestMethod = "POST"; connection.doOutput = true
      connection.connectTimeout = 6000; connection.readTimeout = 6000
      connection.setRequestProperty("Content-Type", "application/json")
      connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
      if (connection.responseCode != 200) { Log.w("CellarPush", "${body.optString("kind")} returned HTTP ${connection.responseCode}"); return null }
      return JSONObject(connection.inputStream.bufferedReader().use { it.readText() })
    } finally { connection.disconnect() }
  }
  fun clear(context: Context, done: () -> Unit) {
    val p = prefs(context)
    val ids = p.getStringSet("shown", emptySet())!!.toTypedArray()
    val config = credentials(context)
    val generations = ids.associateWith { p.getInt("generation:$it", 0) }
    p.edit().clear().commit()
    // Confirm OS removal before permitting another recipient.
    for (id in ids) {
      try {
        dismiss(context, id)
        call(context, JSONObject().put("kind", "ack").put("id", id).put("generation", generations[id]).put("ack", "dismissed"), config)
      } catch (_: Exception) {}
    }
    done()
  }
  private fun dismiss(context: Context, id: String) {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.cancel(id, 0)
    repeat(20) {
      if (manager.activeNotifications.none { it.tag == id }) return
      Thread.sleep(50)
    }
    throw IllegalStateException("Notification dismissal not confirmed")
  }
  fun receive(context: Context, id: String, generation: Int) {
    val config = credentials(context)
    val result = call(context, JSONObject().put("kind", "delivery").put("id", id).put("generation", generation), config) ?: return
    if (credentials(context).optString("owner") != config.optString("owner")) return
    if (result.optBoolean("dismiss")) {
      dismiss(context, id)
      call(context, JSONObject().put("kind", "ack").put("id", id).put("generation", generation).put("ack", "dismissed"), config)
      val p = prefs(context); p.edit().putStringSet("shown", p.getStringSet("shown", emptySet())!!.filter { it != id }.toSet()).remove("generation:$id").commit()
      return
    }
    val payload = result.getJSONObject("payload")
    val note = payload.getJSONObject("note")
    val body = JSONObject(payload.toString()).put("noticeId", id).put("generation", generation).put("ownerId", prefs(context).getString("owner", ""))
    val lines = note.getJSONArray("body")
    val data = mapOf("tag" to id, "title" to note.getString("title"), "message" to (0 until lines.length()).joinToString("\n") { lines.getString(it) },
      "body" to body.toString(), "categoryId" to result.getString("category"), "color" to "#64748b", "channelId" to "questions")
    val message = RemoteMessage.Builder("cellar").setData(data).build()
    val notification = CanonicalDelegate(context).notification(message)
    val p = prefs(context)
    p.edit().putStringSet("shown", p.getStringSet("shown", emptySet())!! + id).putInt("generation:$id", generation).commit()
    CanonicalPresentation(context).show(notification)
    call(context, JSONObject().put("kind", "ack").put("id", id).put("generation", generation).put("ack", "shown"), config)
  }
}

private class CanonicalDelegate(context: Context) : FirebaseMessagingDelegate(context) {
  fun notification(message: RemoteMessage): Notification = createNotification(message)
}

private class CanonicalPresentation(context: Context) : ExpoPresentationDelegate(context) {
  fun show(notification: Notification) = runBlocking {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (!manager.areNotificationsEnabled()) throw IllegalStateException("Notifications disabled")
    manager.notify(notification.notificationRequest.identifier, 0, createNotification(notification, null))
  }
}

class CellarPushService : FirebaseMessagingService() {
  override fun onNewToken(token: String) { FirebaseMessagingDelegate(this).onNewToken(token) }
  override fun onMessageReceived(message: RemoteMessage) {
    val id = message.data["cellarNoticeId"] ?: return
    val generation = message.data["generation"]?.toIntOrNull() ?: return
    if (id.length > 150) return
    // Canonical fetch checks owner, current recipient and generation. Delayed pushes cannot reappear after transfer.
    try { CellarPush.io.submit { CellarPush.receive(this, id, generation) }.get() } catch (e: Exception) { Log.w("CellarPush", "Background delivery failed: ${e.javaClass.simpleName}") }
  }
}
