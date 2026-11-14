import 'dart:async';

import 'package:flutter/widgets.dart' show Locale;
import 'package:flutter_test/flutter_test.dart';
import 'package:weather/core/utils/location_label.dart';
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';
import 'package:weather/core/services/location_service.dart';

Position _testPosition({double lat = 55.75, double lon = 37.62}) {
  return Position(
    latitude: lat,
    longitude: lon,
    timestamp: DateTime.utc(2026, 6, 5, 12),
    accuracy: 0,
    altitude: 0,
    heading: 0,
    speed: 0,
    speedAccuracy: 0,
    altitudeAccuracy: 0,
    headingAccuracy: 0,
  );
}

void main() {
  group('LocationService.getCurrentPlace', () {
    testWidgets('a stalled platform geocoder uses network labels', (
      tester,
    ) async {
      final service = _TestLocationService(
        _TestGeocoding(Completer<List<Placemark>>().future),
      );
      final result = service.getCurrentPlace(
        resolveLabels: (lat, lon) async => (city: 'Berlin', district: 'Berlin'),
      );
      await tester.pump();
      await tester.pump(const Duration(seconds: 5));

      final place = await result;
      expect(place!.city, 'Berlin');
      expect(place.lat, 55.75);
    });

    testWidgets('stalled geocoders fall back to usable coordinates', (
      tester,
    ) async {
      final service = _TestLocationService(
        _TestGeocoding(Completer<List<Placemark>>().future),
      );
      final result = service.getCurrentPlace(
        resolveLabels: (lat, lon) =>
            Completer<({String city, String district})?>().future,
      );
      await tester.pump();
      await tester.pump(const Duration(seconds: 5));
      await tester.pump(const Duration(seconds: 5));

      final place = await result;
      expect(place!.city, '55.750, 37.620');
      expect(place.lon, 37.62);
    });
  });

  group('firstNonEmptyLocationLabel', () {
    test('returns first trimmed non-empty value', () {
      expect(
        firstNonEmptyLocationLabel([null, '  ', 'Berlin', 'Moscow']),
        'Berlin',
      );
    });

    test('returns empty string when all values are blank', () {
      expect(firstNonEmptyLocationLabel([null, '', '   ']), '');
    });
  });

  group('LocationService.parsePlaceFromPlacemarks', () {
    test('builds city and district from placemark fields', () {
      final place = LocationService.parsePlaceFromPlacemarks(_testPosition(), [
        const Placemark(
          locality: 'Moscow',
          administrativeArea: 'Moscow Oblast',
        ),
      ]);

      expect(place, isNotNull);
      expect(place!.city, 'Moscow');
      expect(place.district, 'Moscow Oblast');
      expect(place.lat, 55.75);
      expect(place.lon, 37.62);
    });

    test('returns null when placemarks are empty', () {
      expect(
        LocationService.parsePlaceFromPlacemarks(_testPosition(), []),
        isNull,
      );
    });

    test('returns null when city and district cannot be resolved', () {
      expect(
        LocationService.parsePlaceFromPlacemarks(_testPosition(), [
          const Placemark(),
        ]),
        isNull,
      );
    });
  });
}

class _TestLocationService extends LocationService {
  _TestLocationService(Geocoding geocoding) : super(geocoding: geocoding);

  @override
  Future<Position> determinePosition() async => _testPosition();
}

class _TestGeocoding implements Geocoding {
  _TestGeocoding(this.result);

  final Future<List<Placemark>> result;

  @override
  Future<List<Placemark>> placemarkFromCoordinates(
    double latitude,
    double longitude, {
    Locale? locale,
  }) => result;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
