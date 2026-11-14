import 'package:material_ui/material_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:weather/core/bootstrap/app_bootstrap.dart';
import 'package:weather/core/constants/app_constants.dart';
import 'package:weather/core/di/providers.dart';
import 'package:weather/core/navigation/app_router.dart';
import 'package:weather/i18n/tr.dart';
import 'package:weather/core/theme/material_ui_dynamic_color_builder.dart';
import 'package:weather/core/theme/theme.dart';
import 'package:weather/core/utils/device_info.dart';
import 'package:weather/core/utils/snackbar_overlay.dart';

/// Root widget: routing, theming, localization, and global overlays.
class WeatherApp extends ConsumerStatefulWidget {
  const WeatherApp({super.key, required this.bootstrap});

  final AppBootstrap bootstrap;

  @override
  ConsumerState<WeatherApp> createState() => _WeatherAppState();
}

class _WeatherAppState extends ConsumerState<WeatherApp> {
  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  }

  /// Builds the themed, localized router app with global overlays.
  @override
  Widget build(BuildContext context) {
    final appSettings = ref.watch(appSettingsProvider);
    final appearance = ref.watch(
      settingsProvider.select(
        (s) => (appFont: s.appFont, colorPalette: s.colorPalette),
      ),
    );
    final themeMode = ref.watch(themeModeProvider);
    final router = ref.watch(appRouterProvider);
    final edgeToEdgeAvailable = DeviceFeature().isEdgeToEdgeAvailable();

    return GestureDetector(
      onTap: () => FocusManager.instance.primaryFocus?.unfocus(),
      child: MaterialUiDynamicColorBuilder(
        builder: (lightColorScheme, darkColorScheme) {
          final themes = resolveAppThemes(
            materialColor: appSettings.materialColor,
            amoledTheme: appSettings.amoledTheme,
            colorPalette: appearance.colorPalette,
            lightDynamic: lightColorScheme,
            darkDynamic: darkColorScheme,
            edgeToEdgeAvailable: edgeToEdgeAvailable,
            appFont: appearance.appFont,
          );

          return TranslationProvider(
            child: MaterialApp.router(
              routerConfig: router,
              themeMode: themeMode,
              theme: themes.light,
              darkTheme: themes.dark,
              locale: appSettings.locale,
              supportedLocales: AppLocaleUtils.supportedLocales,
              localizationsDelegates: GlobalMaterialLocalizations.delegates,
              debugShowCheckedModeBanner: false,
              title: AppConstants.appName,
              builder: (context, child) {
                final content = Stack(
                  children: [?child, const SnackBarOverlayWidget()],
                );
                // Required until google_fonts, shimmer, flutter_hsvcolor_picker
                // (and similar) migrate off package:flutter/material.dart.
                // Safe to remove once those packages use material_ui.
                // ignore: deprecated_member_use
                return MaterialUiCompatibilityBridge(child: content);
              },
            ),
          );
        },
      ),
    );
  }
}
