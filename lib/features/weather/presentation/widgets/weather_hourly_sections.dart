import 'package:material_ui/material_ui.dart';
import 'package:weather/features/weather/presentation/widgets/air_quality/air_quality_card.dart';
import 'package:weather/features/weather/presentation/widgets/desc/desc_container.dart';
import 'package:weather/features/weather/presentation/widgets/sunset_sunrise.dart';
import 'package:weather/i18n/tr.dart';
import 'package:weather/domain/entities/entities.dart';

/// Hourly variables, sun times, and air quality below the hourly overview.
class WeatherHourlySections extends StatelessWidget {
  const WeatherHourlySections({
    super.key,
    required this.weatherCard,
    required this.hourIndex,
    required this.aqiStandard,
    required this.sunrise,
    required this.sunset,
    this.hourlyVariablesExpanded = false,
  });

  final SavedPlace weatherCard;
  final int hourIndex;
  final String aqiStandard;
  final String sunrise;
  final String sunset;
  final bool hourlyVariablesExpanded;

  @override
  Widget build(BuildContext context) => Column(
    mainAxisSize: MainAxisSize.min,
    children: [
      DescContainer.fromHourlySlot(
        key: ValueKey('hourly-vars-$hourIndex'),
        card: weatherCard,
        hourIndex: hourIndex,
        initiallyExpanded: hourlyVariablesExpanded,
        title: 'hourlyVariables'.tr,
      ),
      SunsetSunrise(timeSunrise: sunrise, timeSunset: sunset),
      AirQualityCard(
        key: ValueKey('aqi-$hourIndex'),
        weatherCard: weatherCard,
        hourIndex: hourIndex,
        aqiStandard: aqiStandard,
      ),
    ],
  );
}
