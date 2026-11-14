import 'dart:ui';

import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:weather/app.dart';
import 'package:weather/core/bootstrap/app_initializer.dart';
import 'package:weather/core/di/provider_refs.dart';
import 'package:weather/core/utils/debug_log.dart';

/// Entry point: bootstraps dependencies and runs [WeatherApp].
void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    debugLogError('FlutterError', details.exception, details.stack);
  };
  PlatformDispatcher.instance.onError = (error, stack) {
    debugLogError('PlatformDispatcher', error, stack);
    return true;
  };

  final bootstrap = await AppInitializer.initialize();
  runApp(
    ProviderScope(
      overrides: [bootstrapProvider.overrideWithValue(bootstrap)],
      child: WeatherApp(bootstrap: bootstrap),
    ),
  );
}
