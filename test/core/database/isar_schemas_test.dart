import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:isar_community/isar.dart';
import 'package:weather/core/database/isar_schemas.dart';
import 'package:weather/data/models/db.dart';

void main() {
  group('openWeatherIsar', () {
    late Directory directory;
    late Isar isar;

    setUp(() async {
      directory = Directory.systemTemp.createTempSync('weather_isar_schema_');
      isar = await openWeatherIsar(directory: directory.path);
    });

    tearDown(() async {
      if (isar.isOpen) {
        await isar.close(deleteFromDisk: true);
      }
      if (directory.existsSync()) {
        directory.deleteSync(recursive: true);
      }
    });

    test('opens all Weather collections', () async {
      expect(weatherIsarSchemas, hasLength(4));

      await isar.writeTxn(() async {
        await isar.settings.put(Settings()..onboard = true);
        await isar.weatherCards.put(WeatherCard(city: 'Test'));
      });

      expect(await isar.settings.count(), 1);
      expect(await isar.weatherCards.count(), 1);
    });
  });
}
