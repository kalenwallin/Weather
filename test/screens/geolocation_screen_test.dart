import 'dart:async';

import '../helpers/fake_services.dart';

import '../helpers/fixtures.dart';
import '../helpers/isar_test_helper.dart';
import '../helpers/test_bootstrap.dart';
import '../helpers/widget_test_harness.dart';

import 'package:material_ui/material_ui.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax_plus/iconsax_plus.dart';
import 'package:weather/core/di/provider_refs.dart';
import 'package:weather/core/navigation/app_router.dart';
import 'package:weather/core/navigation/app_routes.dart';
import 'package:weather/core/widgets/text_form.dart';
import 'package:weather/features/geolocation/presentation/geolocation_screen.dart';
import 'package:weather/features/weather/application/main_weather_notifier.dart';

Future<void> _enterGeolocationField(
  WidgetTester tester,
  String label,
  String value,
) async {
  final field = find.descendant(
    of: find.ancestor(of: find.text(label), matching: find.byType(MyTextForm)),
    matching: find.byType(TextFormField),
  );
  await tester.enterText(field, value);
  await tester.pump();
}

List geolocationTestOverrides({bool selectionSucceeds = true}) => [
  locationServiceProvider.overrideWithValue(FakeLocationService()),
  weatherRemoteDatasourceProvider.overrideWithValue(
    createFakeWeatherRemoteDatasource(),
  ),
  notificationServiceProvider.overrideWithValue(FakeNotificationService()),
  homeWidgetServiceProvider.overrideWithValue(FakeHomeWidgetService()),
  mainWeatherNotifierProvider.overrideWith(
    () => _GeolocationSubmitMainWeatherNotifier(selectionSucceeds),
  ),
];

void main() {
  late TestBootstrapContext ctx;

  setUp(() async {
    ctx = await createTestBootstrap();
    setTestConnectivity(true);
    await seedWeatherForecast(ctx.isarContext.isar);
  });

  group('SelectGeolocation', () {
    testWidgets('start flow renders location form', (tester) async {
      await pumpWeatherWidget(
        tester,
        const SelectGeolocation(isStart: true),
        bootstrap: ctx.bootstrap,
        overrides: [
          locationServiceProvider.overrideWithValue(FakeLocationService()),
          weatherRemoteDatasourceProvider.overrideWithValue(
            createFakeWeatherRemoteDatasource(),
          ),
        ],
      );
      await tester.pump();

      expect(find.byType(SelectGeolocation), findsOneWidget);
    });

    testWidgets('edit flow renders without start flag', (tester) async {
      await pumpWeatherWidget(
        tester,
        const SelectGeolocation(isStart: false),
        bootstrap: ctx.bootstrap,
        overrides: [
          locationServiceProvider.overrideWithValue(FakeLocationService()),
          weatherRemoteDatasourceProvider.overrideWithValue(
            createFakeWeatherRemoteDatasource(),
          ),
        ],
      );
      await tester.pump();

      expect(find.byType(SelectGeolocation), findsOneWidget);
    });

    testWidgets('shows map and coordinate form fields', (tester) async {
      await pumpWeatherWidget(
        tester,
        const SelectGeolocation(isStart: true),
        bootstrap: ctx.bootstrap,
        overrides: [
          locationServiceProvider.overrideWithValue(FakeLocationService()),
          weatherRemoteDatasourceProvider.overrideWithValue(
            createFakeWeatherRemoteDatasource(),
          ),
        ],
      );
      await tester.pump();

      expect(find.byType(FlutterMap), findsOneWidget);
      expect(find.byType(MyTextForm), findsNWidgets(5));
    });

    testWidgets('city search shows autocomplete suggestions', (tester) async {
      await pumpWeatherWidget(
        tester,
        const SelectGeolocation(isStart: true),
        bootstrap: ctx.bootstrap,
        overrides: [
          locationServiceProvider.overrideWithValue(FakeLocationService()),
          weatherRemoteDatasourceProvider.overrideWithValue(
            createFakeWeatherRemoteDatasource(),
          ),
        ],
      );
      await tester.pump();

      final searchField = find
          .descendant(
            of: find.byType(SelectGeolocation),
            matching: find.byType(EditableText),
          )
          .first;

      await tester.enterText(searchField, 'Moscow');
      await tester.pump();
      await tester.pumpAndSettle(const Duration(milliseconds: 100));

      expect(find.textContaining('Moscow'), findsWidgets);
    });

    testWidgets('exposes GPS location button', (tester) async {
      await pumpWeatherWidget(
        tester,
        const SelectGeolocation(isStart: true),
        bootstrap: ctx.bootstrap,
        overrides: [
          locationServiceProvider.overrideWithValue(FakeLocationService()),
          weatherRemoteDatasourceProvider.overrideWithValue(
            createFakeWeatherRemoteDatasource(),
          ),
        ],
      );
      await tester.pump();

      expect(
        find.descendant(
          of: find.byType(SelectGeolocation),
          matching: find.byType(IconButton),
        ),
        findsWidgets,
      );
    });

    testWidgets(
      'GPS timeout clears the spinner and keeps manual entry usable',
      (tester) async {
        await pumpWeatherWidget(
          tester,
          const SelectGeolocation(isStart: true),
          bootstrap: ctx.bootstrap,
          overrides: [
            locationServiceProvider.overrideWithValue(
              _TimedOutLocationService(),
            ),
            weatherRemoteDatasourceProvider.overrideWithValue(
              createFakeWeatherRemoteDatasource(),
            ),
          ],
        );

        await tester.tap(
          find.widgetWithIcon(IconButton, IconsaxPlusLinear.location),
        );
        await tester.pump();
        expect(find.byType(CircularProgressIndicator), findsOneWidget);

        await tester.pump(const Duration(seconds: 20));
        expect(find.byType(CircularProgressIndicator), findsNothing);
        await _enterGeolocationField(tester, 'City', 'Berlin');
        expect(find.text('Berlin'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );

    testWidgets('filled location form has no validation errors', (
      tester,
    ) async {
      await pumpWeatherWidget(
        tester,
        const SelectGeolocation(isStart: true),
        bootstrap: ctx.bootstrap,
        overrides: [
          locationServiceProvider.overrideWithValue(FakeLocationService()),
          weatherRemoteDatasourceProvider.overrideWithValue(
            createFakeWeatherRemoteDatasource(),
          ),
        ],
      );
      await tester.pump();

      await _enterGeolocationField(tester, 'Latitude', '55.75');
      await _enterGeolocationField(tester, 'Longitude', '37.62');
      await _enterGeolocationField(tester, 'City', 'Moscow');
      await _enterGeolocationField(tester, 'State', 'Moscow Oblast');

      expect(tester.state<FormState>(find.byType(Form)).validate(), isTrue);
      await tester.pump();

      expect(tester.takeException(), isNull);
      expect(find.text('Please enter a value'), findsNothing);
      expect(find.text('Please enter the name'), findsNothing);
    });

    testWidgets('start flow submit navigates to home', (tester) async {
      final router = GoRouter(
        initialLocation: AppRoutes.geolocationStart,
        routes: [
          GoRoute(
            path: AppRoutes.home,
            builder: (context, state) =>
                const Scaffold(body: Text('home-landing')),
          ),
          GoRoute(
            path: AppRoutes.geolocation,
            builder: (context, state) {
              final isStart = state.uri.queryParameters['start'] == 'true';
              return SelectGeolocation(isStart: isStart);
            },
          ),
        ],
      );

      await pumpWeatherRouter(
        tester,
        bootstrap: ctx.bootstrap,
        router: router,
        overrides: geolocationTestOverrides(),
      );
      await tester.pump();

      await _enterGeolocationField(tester, 'Latitude', '55.75');
      await _enterGeolocationField(tester, 'Longitude', '37.62');
      await _enterGeolocationField(tester, 'City', 'Moscow');
      await _enterGeolocationField(tester, 'State', 'Moscow Oblast');

      await tester.tap(find.text('Done'));
      await tester.pump();
      for (var i = 0; i < 30; i++) {
        await tester.pump(const Duration(milliseconds: 50));
        if (find.text('home-landing').evaluate().isNotEmpty) break;
      }

      expect(find.text('home-landing'), findsOneWidget);
      expect(router.state.uri.path, AppRoutes.home);
    });

    testWidgets('failed start submission keeps the entered city for retry', (
      tester,
    ) async {
      final router = GoRouter(
        initialLocation: AppRoutes.geolocationStart,
        routes: [
          GoRoute(
            path: AppRoutes.home,
            builder: (context, state) =>
                const Scaffold(body: Text('home-landing')),
          ),
          GoRoute(
            path: AppRoutes.geolocation,
            builder: (context, state) {
              final isStart = state.uri.queryParameters['start'] == 'true';
              return SelectGeolocation(isStart: isStart);
            },
          ),
        ],
      );

      await pumpWeatherRouter(
        tester,
        bootstrap: ctx.bootstrap,
        router: router,
        overrides: geolocationTestOverrides(selectionSucceeds: false),
      );
      await tester.pump();

      await _enterGeolocationField(tester, 'Latitude', '55.75');
      await _enterGeolocationField(tester, 'Longitude', '37.62');
      await _enterGeolocationField(tester, 'City', 'Moscow');
      await _enterGeolocationField(tester, 'State', 'Moscow Oblast');

      await tester.tap(find.text('Done'));
      await tester.pump();
      for (var i = 0; i < 30; i++) {
        await tester.pump(const Duration(milliseconds: 50));
        if (find.text('home-landing').evaluate().isNotEmpty) break;
      }

      expect(find.text('home-landing'), findsNothing);
      expect(find.byType(SelectGeolocation), findsOneWidget);
      expect(find.text('Moscow'), findsOneWidget);
      expect(find.text('Moscow Oblast'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsNothing);
      expect(router.state.uri.path, AppRoutes.geolocation);
      expect(tester.takeException(), isNull);
    });

    testWidgets('edit flow submit returns to previous page', (tester) async {
      await pumpWeatherRouter(
        tester,
        bootstrap: ctx.bootstrap,
        router: GoRouter(
          initialLocation: AppRoutes.home,
          routes: [
            GoRoute(
              path: AppRoutes.home,
              builder: (context, state) => Scaffold(
                body: Builder(
                  builder: (context) => ElevatedButton(
                    onPressed: () => context.pushRouteUp(
                      const SelectGeolocation(isStart: false),
                    ),
                    child: const Text('Edit location'),
                  ),
                ),
              ),
            ),
          ],
        ),
        overrides: geolocationTestOverrides(),
      );
      await tester.pump();

      await tester.tap(find.text('Edit location'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.byType(SelectGeolocation), findsOneWidget);

      await _enterGeolocationField(tester, 'Latitude', '52.52');
      await _enterGeolocationField(tester, 'Longitude', '13.41');
      await _enterGeolocationField(tester, 'City', 'Berlin');
      await _enterGeolocationField(tester, 'State', 'Berlin');

      await tester.tap(find.text('Done'));
      await tester.pump();
      for (var i = 0; i < 30; i++) {
        await tester.pump(const Duration(milliseconds: 50));
        if (find.text('Edit location').evaluate().isNotEmpty) break;
      }

      expect(find.text('Edit location'), findsOneWidget);
    });
  });
}

class _TimedOutLocationService extends FakeLocationService {
  @override
  Future<({double lat, double lon, String city, String district})?>
  getCurrentPlace({
    Future<({String city, String district})?> Function(double lat, double lon)?
    resolveLabels,
  }) async {
    await Future<void>.delayed(const Duration(seconds: 20));
    throw TimeoutException('GPS fix unavailable');
  }
}

class _GeolocationSubmitMainWeatherNotifier extends MainWeatherNotifier {
  _GeolocationSubmitMainWeatherNotifier(this.selectionSucceeds);

  final bool selectionSucceeds;

  @override
  MainWeatherState build() =>
      MainWeatherState(isLoading: false, location: sampleGeoPlace());

  @override
  Future<bool> getLocation(
    double latitude,
    double longitude,
    String district,
    String locality, {
    bool showLoading = true,
  }) async => selectionSucceeds;
}
