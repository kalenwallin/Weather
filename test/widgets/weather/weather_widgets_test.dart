import '../../helpers/fixtures.dart';
import '../../helpers/test_bootstrap.dart';
import '../../helpers/widget_test_harness.dart';

import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:weather/domain/entities/entities.dart';
import 'package:weather/features/weather/presentation/widgets/desc/desc.dart';
import 'package:weather/features/weather/presentation/widgets/desc/desc_container.dart';
import 'package:weather/features/weather/presentation/widgets/hourly.dart';
import 'package:weather/features/weather/presentation/widgets/now.dart';
import 'package:weather/features/weather/presentation/widgets/sunset_sunrise.dart';
import 'package:weather/features/weather/presentation/widgets/daily/daily_card.dart';
import 'package:weather/features/weather/presentation/widgets/daily/daily_card_list.dart';
import 'package:weather/features/weather/presentation/widgets/daily/daily_container.dart';
import 'package:scrollable_positioned_list/scrollable_positioned_list.dart';
import 'package:weather/features/weather/presentation/widgets/weather_detail_view.dart';
import 'package:weather/features/weather/presentation/widgets/weather_hourly_sections.dart';
import 'package:weather/features/weather/presentation/widgets/air_quality/air_quality_card.dart';

void main() {
  late TestBootstrapContext ctx;
  late SavedPlace card;

  setUp(() async {
    ctx = await createTestBootstrap();
    card = completeSavedPlace();
  });

  double req(double? v) => v!;

  tearDown(() async {});

  testWidgets('Now renders compact layout by default', (tester) async {
    await pumpWeatherWidget(
      tester,
      Now(
        time: card.time!.first,
        weather: card.weathercode!.first,
        degree: card.temperature2M!.first,
        feels: req(card.apparentTemperature!.first),
        timeDay: card.sunrise!.first,
        timeNight: card.sunset!.first,
        tempMax: req(card.temperature2MMax!.first),
        tempMin: req(card.temperature2MMin!.first),
      ),
      bootstrap: ctx.bootstrap,
    );

    expect(find.byType(Card), findsOneWidget);
  });

  testWidgets('Now shows last updated when timestamp is set', (tester) async {
    await pumpWeatherWidget(
      tester,
      Now(
        time: card.time!.first,
        weather: card.weathercode!.first,
        degree: card.temperature2M!.first,
        feels: req(card.apparentTemperature!.first),
        timeDay: card.sunrise!.first,
        timeNight: card.sunset!.first,
        tempMax: req(card.temperature2MMax!.first),
        tempMin: req(card.temperature2MMin!.first),
        updatedAt: DateTime(2026, 6, 9, 14, 30),
      ),
      bootstrap: ctx.bootstrap,
    );

    expect(find.textContaining('Updated:'), findsOneWidget);
    expect(find.textContaining('14:30'), findsOneWidget);
  });

  testWidgets('Now renders large layout when enabled', (tester) async {
    ctx.bootstrap.settings.largeElement = true;

    await pumpWeatherWidget(
      tester,
      Now(
        time: card.time!.first,
        weather: card.weathercode!.first,
        degree: card.temperature2M!.first,
        feels: req(card.apparentTemperature!.first),
        timeDay: card.sunrise!.first,
        timeNight: card.sunset!.first,
        tempMax: req(card.temperature2MMax!.first),
        tempMin: req(card.temperature2MMin!.first),
      ),
      bootstrap: ctx.bootstrap,
    );

    expect(find.byType(Card), findsNothing);
  });

  testWidgets('Hourly renders time column', (tester) async {
    await pumpWeatherWidget(
      tester,
      Hourly(
        time: card.time!.first,
        weather: card.weathercode!.first,
        degree: card.temperature2M!.first,
        timeDay: card.sunrise!.first,
        timeNight: card.sunset!.first,
      ),
      bootstrap: ctx.bootstrap,
    );

    expect(find.byType(Column), findsWidgets);
  });

  testWidgets('SunsetSunrise renders card', (tester) async {
    await pumpWeatherWidget(
      tester,
      SunsetSunrise(
        timeSunrise: card.sunrise!.first,
        timeSunset: card.sunset!.first,
      ),
      bootstrap: ctx.bootstrap,
    );

    expect(find.byType(Card), findsOneWidget);
  });

  testWidgets('DescWeather toggles description on tap', (tester) async {
    await pumpWeatherWidget(
      tester,
      const DescWeather(
        imageName: 'assets/icons/icon.png',
        value: '50%',
        desc: 'Humidity',
      ),
      bootstrap: ctx.bootstrap,
    );

    await tester.tap(find.byType(GestureDetector));
    await tester.pump();
    expect(find.text('Humidity'), findsOneWidget);
  });

  testWidgets('DescContainer renders expandable section', (tester) async {
    await pumpWeatherWidget(
      tester,
      const DescContainer(
        humidity: 50,
        wind: 5,
        initiallyExpanded: true,
        title: 'Hourly variables',
      ),
      bootstrap: ctx.bootstrap,
    );

    expect(find.text('Hourly variables'), findsOneWidget);
  });

  testWidgets('hourly variables keep two preview rows when toggled', (
    tester,
  ) async {
    await pumpWeatherWidget(
      tester,
      SingleChildScrollView(
        child: DescContainer.fromHourlySlot(
          card: card,
          hourIndex: 0,
          initiallyExpanded: false,
          title: 'Hourly variables',
        ),
      ),
      bootstrap: ctx.bootstrap,
    );

    const previewKeys = [
      'wind',
      'windgusts',
      'precipitationProbability',
      'humidity',
      'uvIndex',
      'cloudcover',
    ];
    expect(find.byType(DescWeather), findsNWidgets(6));
    final positions = [
      for (final key in previewKeys)
        tester.getTopLeft(find.byKey(ValueKey(key))),
    ];
    expect(positions.take(3).map((p) => p.dy).toSet(), hasLength(1));
    expect(positions.skip(3).map((p) => p.dy).toSet(), hasLength(1));
    expect(positions[3].dy, greaterThan(positions[0].dy));
    expect(positions[0].dx, lessThan(positions[1].dx));
    expect(positions[1].dx, lessThan(positions[2].dx));
    expect(find.byKey(const ValueKey('pressure')), findsNothing);

    await tester.tap(find.text('Hourly variables'));
    await tester.pumpAndSettle();

    expect(find.byType(DescWeather), findsNWidgets(15));
    expect(find.byKey(const ValueKey('pressure')), findsOneWidget);
    for (final key in previewKeys) {
      expect(find.byKey(ValueKey(key)), findsOneWidget);
    }

    await tester.tap(find.text('Hourly variables'));
    await tester.pumpAndSettle();
    expect(find.byType(DescWeather), findsNWidgets(6));
    expect(find.byKey(const ValueKey('pressure')), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('hourly variables appear above sun times and air quality', (
    tester,
  ) async {
    await pumpWeatherWidget(
      tester,
      SingleChildScrollView(
        child: WeatherHourlySections(
          weatherCard: card,
          hourIndex: 0,
          aqiStandard: 'european',
          sunrise: card.sunrise!.first,
          sunset: card.sunset!.first,
        ),
      ),
      bootstrap: ctx.bootstrap,
    );

    expect(
      tester.getTopLeft(find.byType(DescContainer)).dy,
      lessThan(tester.getTopLeft(find.byType(SunsetSunrise)).dy),
    );
    expect(
      tester.getTopLeft(find.byType(SunsetSunrise)).dy,
      lessThan(tester.getTopLeft(find.byType(AirQualityCard)).dy),
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('DailyCardList renders forecast rows', (tester) async {
    await pumpWeatherWidget(
      tester,
      DailyCardList(weatherData: card),
      bootstrap: ctx.bootstrap,
    );

    expect(find.byType(DailyCard), findsWidgets);
  });

  testWidgets('DailyContainer renders preview and more button', (tester) async {
    final weekly = weeklySavedPlace();
    await pumpWeatherWidget(
      tester,
      DailyContainer(
        weatherData: weekly,
        dayIndex: 0,
        hourIndex: 0,
        onTap: () {},
      ),
      bootstrap: ctx.bootstrap,
    );

    expect(find.byType(InkWell), findsWidgets);
    expect(find.text('Today'), findsOneWidget);
    expect(find.text('Tomorrow'), findsOneWidget);
  });

  testWidgets('WeatherDetailView renders main sections', (tester) async {
    final weekly = weeklySavedPlace();
    final scrollController = ItemScrollController();
    await pumpWeatherWidget(
      tester,
      WeatherDetailView(
        weatherCard: weekly,
        hourIndex: 0,
        dayIndex: 0,
        aqiStandard: 'european',
        itemScrollController: scrollController,
        onHourSelected: (_, _) {},
      ),
      bootstrap: ctx.bootstrap,
    );

    expect(find.byType(Now), findsOneWidget);

    await tester.scrollUntilVisible(
      find.byType(DailyContainer),
      500,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.byType(DailyContainer), findsOneWidget);
  });
}
