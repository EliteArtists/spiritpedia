// Firebase options for the spiritpedia project (Firebase project ID
// spiritpedia-d190c), in the shape `flutterfire configure` generates. Built from
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
    apiKey: 'AIzaSyC4llFrTCfIeTQs-h7oMj0-3DTHYR2qBx0',
    appId: '1:225029060380:android:a7a56ce5a435ef0c62acd9',
    messagingSenderId: '225029060380',
    projectId: 'spiritpedia-d190c',
    storageBucket: 'spiritpedia-d190c.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyCFIalMCfhjQwsrpbQPRavxddymHumRZVY',
    appId: '1:225029060380:ios:3c5068699b04b44662acd9',
    messagingSenderId: '225029060380',
    projectId: 'spiritpedia-d190c',
    storageBucket: 'spiritpedia-d190c.firebasestorage.app',
    iosBundleId: 'co.spiritpedia.app',
  );
}
