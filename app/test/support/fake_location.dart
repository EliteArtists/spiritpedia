import 'package:spiritpedia/features/area/location_source.dart';

/// "Use my location" without a phone: a fixed answer.
class FakeLocation implements LocationSource {
  FakeLocation({this.problem, this.lat = 51.51, this.lng = -0.13});

  final LocationProblem? problem;
  final double lat;
  final double lng;
  int asked = 0;
  int settings = 0;

  @override
  Future<LocationOutcome> approximatePosition() async {
    asked++;
    return problem != null
        ? (lat: null, lng: null, problem: problem)
        : (lat: lat, lng: lng, problem: null);
  }

  @override
  Future<void> openSettings() async => settings++;
}
