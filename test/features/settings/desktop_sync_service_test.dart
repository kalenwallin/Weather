import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:weather/core/di/provider_refs.dart';
import 'package:weather/domain/entities/geo_place.dart';
import 'package:weather/features/settings/application/desktop_sync_service.dart';

import '../../helpers/fixtures.dart';
import '../../helpers/isar_test_helper.dart';
import '../../helpers/test_bootstrap.dart';

void main() {
  late TestBootstrapContext context;
  late ProviderContainer container;

  setUp(() async {
    context = await createTestBootstrap(
      settings: onboardedSettings()
        ..degrees = 'fahrenheit'
        ..measurements = 'imperial'
        ..widgetBackgroundColorDark = '#ff1a1925',
    );
    await seedWeatherForecast(
      context.isarContext.isar,
      location: const GeoPlace(
        city: 'Lincoln',
        district: 'Nebraska',
        lat: 40.8,
        lon: -96.667,
      ),
    );
    await seedSavedPlace(
      context.isarContext.isar,
      completeSavedPlace(index: 1).copyWith(
        id: null,
        city: 'Denver',
        district: 'Colorado',
        lat: 39.74,
        lon: -104.99,
      ),
    );
    await seedSavedPlace(
      context.isarContext.isar,
      completeSavedPlace(index: 0).copyWith(
        id: null,
        city: 'Omaha',
        district: 'Nebraska',
        lat: 41.26,
        lon: -95.94,
      ),
    );
    container = createTestContainer(bootstrap: context.bootstrap);
  });
  tearDown(() async {
    container.dispose();
    await context.dispose();
  });

  DesktopSyncService service({Dio? dio}) => DesktopSyncService(
    weather: container.read(weatherRepositoryProvider),
    cities: container.read(citiesRepositoryProvider),
    settings: container.read(settingsRepositoryProvider),
    dio: dio,
  );

  test('exports the main city, ordered saved cities, and configuration without forecasts', () async {
    final configuration = await service().buildConfiguration();
    expect(configuration['version'], 1);
    expect(configuration['mainCity'], {
      'city': 'Lincoln',
      'district': 'Nebraska',
      'lat': 40.8,
      'lon': -96.667,
    });
    final cities = configuration['cities'] as List;
    expect(cities.map((city) => city['city']), ['Omaha', 'Denver']);
    expect(
      cities.first.keys,
      unorderedEquals(['city', 'district', 'lat', 'lon']),
    );
    final settings = configuration['settings'] as Map;
    expect(settings['degrees'], 'fahrenheit');
    expect(settings['measurements'], 'imperial');
    expect(settings['widgetBackgroundColorDark'], '#ff1a1925');
    expect(settings.containsKey('notificationWeekdaysMask'), isTrue);
    expect(DateTime.parse(configuration['exportedAt'] as String).isUtc, isTrue);
    expect(
      (await container.read(weatherRepositoryProvider).readCache())
          .location!
          .city,
      'Lincoln',
    );
    expect(
      (await container.read(citiesRepositoryProvider).getAllSorted()).length,
      2,
    );
  });

  test('normalizes a pairing code and sends the snapshot to the configured website', () async {
    RequestOptions? request;
    final dio = Dio()
      ..interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            request = options;
            handler.resolve(Response(requestOptions: options, statusCode: 200));
          },
        ),
      );
    await service(dio: dio).sendConfiguration('abcd-efgh');
    expect(
      request!.uri.toString(),
      'https://weather.kalenwallin.com/api/sync/ABCDEFGH',
    );
    expect(request!.method, 'POST');
    expect((request!.data as Map)['version'], 1);
    expect((request!.data as Map)['settings']['degrees'], 'fahrenheit');
  });

  test(
    'rejects invalid or ambiguous pairing codes before sending a request',
    () async {
      var requested = false;
      final dio = Dio()
        ..interceptors.add(
          InterceptorsWrapper(
            onRequest: (options, handler) {
              requested = true;
              handler.resolve(
                Response(requestOptions: options, statusCode: 200),
              );
            },
          ),
        );
      expect(DesktopSyncService.isValidCode('ABCD EFGH'), isTrue);
      expect(DesktopSyncService.isValidCode('ABCD-0123'), isFalse);
      await expectLater(
        service(dio: dio).sendConfiguration('bad-code'),
        throwsA(isA<DesktopSyncException>()),
      );
      expect(requested, isFalse);
    },
  );

  test(
    'explains an expired code and preserves phone data after a failed transfer',
    () async {
      final dio = Dio()
        ..interceptors.add(
          InterceptorsWrapper(
            onRequest: (options, handler) {
              handler.reject(
                DioException(
                  requestOptions: options,
                  response: Response(
                    requestOptions: options,
                    statusCode: 410,
                    data: {'error': 'This pairing code has expired.'},
                  ),
                ),
              );
            },
          ),
        );
      await expectLater(
        service(dio: dio).sendConfiguration('ABCDEFGH'),
        throwsA(
          isA<DesktopSyncException>().having(
            (error) => error.message,
            'message',
            'This pairing code has expired.',
          ),
        ),
      );
      expect(
        (await container.read(settingsRepositoryProvider).getSettings())
            .widgetBackgroundColorDark,
        '#ff1a1925',
      );
      expect(
        (await container.read(citiesRepositoryProvider).getAllSorted()).length,
        2,
      );
    },
  );
}
