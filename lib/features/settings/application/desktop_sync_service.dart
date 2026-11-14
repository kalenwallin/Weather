import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:weather/core/di/provider_refs.dart';
import 'package:weather/domain/entities/app_settings.dart';
import 'package:weather/domain/repositories/cities_repository.dart';
import 'package:weather/domain/repositories/settings_repository.dart';
import 'package:weather/domain/repositories/weather_repository.dart';

final desktopSyncServiceProvider = Provider<DesktopSyncService>(
  (ref) => DesktopSyncService(
    weather: ref.read(weatherRepositoryProvider),
    cities: ref.read(citiesRepositoryProvider),
    settings: ref.read(settingsRepositoryProvider),
  ),
);

/// Transfers a configuration snapshot to a short-lived desktop pairing session.
class DesktopSyncService {
  DesktopSyncService({
    required this.weather,
    required this.cities,
    required this.settings,
    Dio? dio,
  }) : _dio =
           dio ?? Dio(BaseOptions(connectTimeout: const Duration(seconds: 15)));

  final WeatherRepository weather;
  final CitiesRepository cities;
  final SettingsRepository settings;
  final Dio _dio;
  static const website = 'https://weather.kalenwallin.com';

  static String normalizeCode(String code) =>
      code.replaceAll(RegExp(r'[-\s]'), '').toUpperCase();

  static bool isValidCode(String code) =>
      RegExp(r'^[A-HJ-NP-Z2-9]{8}$').hasMatch(normalizeCode(code));

  /// Reads locations and all settings without changing the phone's configuration.
  Future<Map<String, dynamic>> buildConfiguration() async {
    final cached = await weather.readCache();
    final location = cached.location ?? await settings.getLocationCache();
    final preferences = await settings.getSettings();
    final savedCities = await cities.getAllSorted();
    if (savedCities.length > 100) {
      throw const DesktopSyncException(
        'A transfer supports up to 100 saved cities.',
      );
    }
    return {
      'version': 1,
      'mainCity': _city(
        location.lat,
        location.lon,
        location.city,
        location.district,
      ),
      'cities': [
        for (final city in savedCities)
          if (_city(city.lat, city.lon, city.city, city.district)
              case final Map<String, dynamic> value)
            value,
      ],
      'settings': settingsToConfiguration(preferences),
      'exportedAt': DateTime.now().toUtc().toIso8601String(),
    };
  }

  Future<void> sendConfiguration(String input) async {
    final code = normalizeCode(input);
    if (!isValidCode(code)) {
      throw const DesktopSyncException(
        'Enter the eight-character pairing code shown on your desktop.',
      );
    }
    final configuration = await buildConfiguration();
    final cancelToken = CancelToken();
    try {
      await _dio
          .post<void>(
            '$website/api/sync/$code',
            data: configuration,
            cancelToken: cancelToken,
            options: Options(contentType: Headers.jsonContentType),
          )
          .timeout(
            const Duration(seconds: 20),
            onTimeout: () {
              cancelToken.cancel('Transfer deadline exceeded');
              throw const DesktopSyncException(
                'The transfer timed out. Check your internet connection and try again.',
              );
            },
          );
    } on DioException catch (error) {
      final data = error.response?.data;
      final message = data is Map ? data['error'] : null;
      throw DesktopSyncException(
        message is String ? message : 'Could not send the configuration. Check your internet connection and try again.',
      );
    }
  }

  static Map<String, dynamic>? _city(
    double? lat,
    double? lon,
    String? city,
    String? district,
  ) {
    if (lat == null ||
        lon == null ||
        !lat.isFinite ||
        !lon.isFinite ||
        lat.abs() > 90 ||
        lon.abs() > 180) {
      return null;
    }
    final label = city?.trim().isNotEmpty == true
        ? city!.trim()
        : district?.trim() ?? '';
    if (label.isEmpty) return null;
    return {'city': label, 'district': district ?? '', 'lat': lat, 'lon': lon};
  }

  static Map<String, dynamic> settingsToConfiguration(AppSettings s) => {
    'onboard': s.onboard,
    'theme': s.theme,
    'location': s.location,
    'notifications': s.notifications,
    'notificationSound': s.notificationSound,
    'notificationWeekdaysMask': s.notificationWeekdaysMask,
    'persistentNotification': s.persistentNotification,
    'materialColor': s.materialColor,
    'colorPalette': s.colorPalette,
    'amoledTheme': s.amoledTheme,
    'roundDegree': s.roundDegree,
    'largeElement': s.largeElement,
    'hideMap': s.hideMap,
    'widgetBackgroundColor': s.widgetBackgroundColor,
    'widgetTextColor': s.widgetTextColor,
    'widgetBackgroundColorLight': s.widgetBackgroundColorLight,
    'widgetBackgroundColorDark': s.widgetBackgroundColorDark,
    'widgetTextColorLight': s.widgetTextColorLight,
    'widgetTextColorDark': s.widgetTextColorDark,
    'measurements': s.measurements,
    'degrees': s.degrees,
    'wind': s.wind,
    'pressure': s.pressure,
    'timeformat': s.timeformat,
    'appFont': s.appFont,
    'weatherIconTheme': s.weatherIconTheme,
    'aqiStandard': s.aqiStandard,
    'language': s.language,
    'timeRange': s.timeRange,
    'timeStart': s.timeStart,
    'timeEnd': s.timeEnd,
    'weatherCacheVersion': s.weatherCacheVersion,
    'notificationChannelVersion': s.notificationChannelVersion,
    'clockSkewSeconds': s.clockSkewSeconds,
  };
}

class DesktopSyncException implements Exception {
  const DesktopSyncException(this.message);
  final String message;
  @override
  String toString() => message;
}
