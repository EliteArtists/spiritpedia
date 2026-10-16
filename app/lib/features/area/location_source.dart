import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

/// Why "Use my location" could not give a position.
enum LocationProblem {
  /// Location Services are off for the whole phone.
  off,

  /// They said no just now.
  denied,

  /// They said no before: only Settings can change it.
  blocked,

  /// No position came (indoors, no signal, too slow).
  failed,
}

typedef LocationOutcome = ({
  double? lat,
  double? lng,
  LocationProblem? problem,
});

/// One approximate position, asked for only when someone taps "Use my
/// location". iOS is told to offer approximate location only
/// (NSLocationDefaultAccuracyReduced), and the position is used once, to
/// find a town, and kept nowhere. Overridden in tests.
abstract class LocationSource {
  Future<LocationOutcome> approximatePosition();
  Future<void> openSettings();
}

class DeviceLocationSource implements LocationSource {
  @override
  Future<LocationOutcome> approximatePosition() async {
    LocationOutcome fail(LocationProblem p) =>
        (lat: null, lng: null, problem: p);
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        return fail(LocationProblem.off);
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied) {
        return fail(LocationProblem.denied);
      }
      if (permission == LocationPermission.deniedForever ||
          permission == LocationPermission.unableToDetermine) {
        return fail(LocationProblem.blocked);
      }
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.reduced,
          timeLimit: Duration(seconds: 15),
        ),
      );
      return (lat: position.latitude, lng: position.longitude, problem: null);
    } catch (_) {
      return fail(LocationProblem.failed);
    }
  }

  @override
  Future<void> openSettings() async {
    try {
      await Geolocator.openAppSettings();
    } catch (_) {}
  }
}

final locationSourceProvider = Provider<LocationSource>(
  (ref) => DeviceLocationSource(),
);
