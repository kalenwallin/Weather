import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:weather/core/bootstrap/app_bootstrap.dart';
import 'package:weather/core/di/provider_refs.dart';
import 'package:weather/data/mappers/domain_mapper.dart';
import 'package:weather/data/models/db.dart';
import 'package:weather/domain/entities/entities.dart';

import 'isar_test_helper.dart';
import 'fixtures.dart';

/// Result of [createTestBootstrap] with resources to tear down.
class TestBootstrapContext {
  TestBootstrapContext({required this.bootstrap, required this.isarContext});

  final AppBootstrap bootstrap;
  final TestIsarContext isarContext;

  Future<void> dispose() async {
    // Shared Isar is closed in flutter_test_config.dart.
  }
}

/// Creates an [AppBootstrap] backed by a temporary Isar database.
Future<TestBootstrapContext> createTestBootstrap({
  Settings? settings,
  GeoPlace? locationCache,
}) async {
  final isarContext = await openTestIsar();
  final settingsObj = settings ?? onboardedSettings();
  await seedSettings(isarContext.isar, settingsObj);

  final location = locationCache ?? sampleGeoPlace();
  return TestBootstrapContext(
    bootstrap: AppBootstrap(
      isar: isarContext.isar,
      settings: settingsObj,
      locationCache: DomainMapper.placeToIsar(location),
    ),
    isarContext: isarContext,
  );
}

/// Creates a [ProviderContainer] with bootstrap and optional overrides.
ProviderContainer createTestContainer({
  required AppBootstrap bootstrap,
  List overrides = const [],
}) {
  return ProviderContainer(
    overrides: [bootstrapProvider.overrideWithValue(bootstrap), ...overrides],
  );
}
