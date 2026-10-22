import java.util.Properties

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// The Google Play upload key lives outside the repo (README §Android):
// ~/.secrets/spiritpedia/android/key.properties names the keystore and its
// passwords. Without it a release build is signed with the debug key, which
// Google Play refuses — fine for `flutter run --release`, never for upload.
val uploadKeyProperties = Properties().apply {
    val file = File(System.getProperty("user.home"), ".secrets/spiritpedia/android/key.properties")
    if (file.exists()) file.inputStream().use { load(it) }
}
val hasUploadKey = uploadKeyProperties.getProperty("storeFile") != null

android {
    namespace = "co.spiritpedia.app"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "co.spiritpedia.app"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        // Uses the version code from pubspec.yaml. When using split APKs, 1000 * ABI_VERSION
        // is added automatically by Flutter. (https://developer.android.com/studio/build/configure-apk-splits#configure-APK-versions)
        // You can force using the value of versionCode by specifying the `-P force-version-code-ignoring-abi=true`
        // flag during build.
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (hasUploadKey) {
            create("upload") {
                storeFile = file(uploadKeyProperties.getProperty("storeFile"))
                storePassword = uploadKeyProperties.getProperty("storePassword")
                keyAlias = uploadKeyProperties.getProperty("keyAlias")
                keyPassword = uploadKeyProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName(if (hasUploadKey) "upload" else "debug")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
