// Firebase options for the spiritpedia-dev project (Firebase project ID
// spiritpedia-dev-5e4d5, owned by love@spiritpedia.co), in the shape `flutterfire
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
    apiKey: 'AIzaSyAZ4-WI2KdmLcuw5nRIaoj0Cjtu13GPW8Y',
    appId: '1:905307569923:android:72566319b896f083cbf336',
    messagingSenderId: '905307569923',
    projectId: 'spiritpedia-dev-5e4d5',
    storageBucket: 'spiritpedia-dev-5e4d5.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyAINTBkFEwsC48xZim7kkxKvCWFC5-tt1s',
    appId: '1:905307569923:ios:9240e7885291f083cbf336',
    messagingSenderId: '905307569923',
    projectId: 'spiritpedia-dev-5e4d5',
    storageBucket: 'spiritpedia-dev-5e4d5.firebasestorage.app',
    iosBundleId: 'co.spiritpedia.app',
  );
}
