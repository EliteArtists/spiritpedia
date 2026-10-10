import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_native_splash/flutter_native_splash.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'core/auth/secure_session_storage.dart';
import 'core/config.dart';
import 'core/firebase/firebase_setup.dart';
import 'core/retry.dart';
import 'features/notifications/notifications_controller.dart';
import 'features/notifications/push_messaging.dart';
import 'theme/colors.dart';

Future<void> main() async {
  final binding = WidgetsFlutterBinding.ensureInitialized();

  // Keep the static launch screen up until the intro has its first frame
  // ready (IntroOverlay removes it), so there is no flash in between.
  FlutterNativeSplash.preserve(widgetsBinding: binding);

  // Portrait only for v1 (also set natively in Info.plist and the manifest).
  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);

  // Geist ships with the app; its licence belongs on the licences page.
  LicenseRegistry.addLicense(() async* {
    final text = await rootBundle.loadString('assets/fonts/Geist-OFL.txt');
    yield LicenseEntryWithLineBreaks(const ['Geist font'], text);
  });

  final missing = AppConfig.missing;
  if (missing.isNotEmpty) {
    FlutterNativeSplash.remove();
    runApp(_ConfigMissingApp(missing));
    return;
  }

  // supabase_flutter 2.18 calls the public key `publishableKey` (formerly
  // anonKey). It is the same anon key the website ships — never a secret key.
  //
  // The session is kept in secure storage (lib/core/auth), and sign-in is the
  // emailed 6-digit code — the app never handles a sign-in link.
  await Supabase.initialize(
    url: AppConfig.supabaseUrl,
    publishableKey: AppConfig.supabaseAnonKey,
    authOptions: FlutterAuthClientOptions(
      localStorage: SecureSessionStorage(),
      detectSessionInUri: false,
    ),
  );

  // Push notifications (Firebase Cloud Messaging only). Starting Firebase
  // creates no token — that waits for the person to say yes in Account. If
  // this build has no Firebase config, push is simply unavailable.
  final pushReady = await initFirebase();

  runApp(
    ProviderScope(
      retry: spiritpediaRetry,
      overrides: [
        if (pushReady)
          pushMessagingProvider.overrideWithValue(FirebasePushMessaging()),
      ],
      child: const SpiritpediaApp(),
    ),
  );
}

/// Shown instead of crashing when the app was started without its config file.
class _ConfigMissingApp extends StatelessWidget {
  const _ConfigMissingApp(this.missing);

  final List<String> missing;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        backgroundColor: SpColors.background,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              'Missing build configuration: ${missing.join(', ')}.\n\n'
              'Run with:\nflutter run --dart-define-from-file=config/prod.json',
              style: const TextStyle(
                color: SpColors.text,
                fontSize: 15,
                height: 1.5,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
