/// Metadata for a home-screen widget provider on Android.
class WidgetDefinition {
  const WidgetDefinition({
    required this.id,
    required this.androidName,
    required this.qualifiedAndroidName,
    required this.labelKey,
  });

  final String id;
  final String androidName;
  final String qualifiedAndroidName;

  /// Slang key for the pin-to-home label in widget settings.
  final String labelKey;
}

/// All Weather home-screen widgets registered in the app.
///
/// Keep in sync with [WeatherHomeWidgetProvider] provider classes and
/// `AndroidManifest.xml` receivers.
const List<WidgetDefinition> weatherWidgetRegistry = [
  WidgetDefinition(
    id: 'material_you_forecast_1x1',
    androidName: 'WidgetMaterialYouForecast1x1Provider',
    qualifiedAndroidName:
        'com.yoshi.weather.widget.providers.WidgetMaterialYouForecast1x1Provider',
    labelKey: 'widgetMaterialYouCompact',
  ),
  WidgetDefinition(
    id: 'material_you_current',
    androidName: 'WidgetMaterialYouCurrentProvider',
    qualifiedAndroidName:
        'com.yoshi.weather.widget.providers.WidgetMaterialYouCurrentProvider',
    labelKey: 'widgetMaterialYouCurrent',
  ),
  WidgetDefinition(
    id: 'clock',
    androidName: 'WidgetClockDayHorizontalProvider',
    qualifiedAndroidName:
        'com.yoshi.weather.widget.providers.WidgetClockDayHorizontalProvider',
    labelKey: 'widgetMaterialYouClock',
  ),
];
