package co.spiritpedia.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        createNotificationChannels()
    }

    // Android 8+ shows a notification only on a channel, and lets people
    // switch each channel off in Settings. "General" is the one in use; the
    // server sends with channel_id "general". "IAM affirmations" is added
    // here when that feature arrives. Creating an existing channel is a no-op.
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(NotificationManager::class.java) ?: return
        val general = NotificationChannel(
            "general",
            "General",
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply { description = "A welcome, and news from Spiritpedia" }
        manager.createNotificationChannel(general)
    }
}
