// Firebase options for the spiritpedia-dev project (Firebase project ID
// spiritpedia-dev), in the shape `flutterfire configure` generates. Built from
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
    apiKey: 'AIzaSyDYUf6b7asUU1tt2rom04GXfcuK2gIgIeA',
    appId: '1:333017406784:android:5244f984735cee10d7eea5',
    messagingSenderId: '333017406784',
    projectId: 'spiritpedia-dev',
    storageBucket: 'spiritpedia-dev.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyB7ozFNkwiFJ9wW3XkyoJWWC2H48XiWBAg',
    appId: '1:333017406784:ios:5980c71d8274ab51d7eea5',
    messagingSenderId: '333017406784',
    projectId: 'spiritpedia-dev',
    storageBucket: 'spiritpedia-dev.firebasestorage.app',
    iosBundleId: 'co.spiritpedia.app',
  );
}
