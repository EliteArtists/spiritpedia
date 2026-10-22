// Firebase options for the spiritpedia project (Firebase project ID
// spiritpedia-ad62b, owned by love@spiritpedia.co), in the shape `flutterfire
// configure` generates. Built from
// `firebase apps:sdkconfig` for the registered iOS and Android apps
// (co.spiritpedia.app). These values are public by design — they identify
// the app to Firebase and grant nothing on their own; sending needs the
// server's service account, which never leaves Vercel.
//
// Regenerate if an app is re-registered in the Firebase console.
// ignore_for_file: type=lint
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        throw UnsupportedError('Spiritpedia runs on iOS and Android only.');
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyAKM6aCV5h4Bwhxm-knuvoT4vdU6HN3Szs',
    appId: '1:203830486586:android:c56680173f62d577bff703',
    messagingSenderId: '203830486586',
    projectId: 'spiritpedia-ad62b',
    storageBucket: 'spiritpedia-ad62b.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyDFXemgvITUMX-ZHC6JdatsG2BAMIaGsOY',
    appId: '1:203830486586:ios:e3b35461988cb851bff703',
    messagingSenderId: '203830486586',
    projectId: 'spiritpedia-ad62b',
    storageBucket: 'spiritpedia-ad62b.firebasestorage.app',
    iosBundleId: 'co.spiritpedia.app',
  );
}
