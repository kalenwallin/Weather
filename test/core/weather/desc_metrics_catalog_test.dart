import '../../helpers/test_helpers.dart';

import 'package:flutter_test/flutter_test.dart';
import 'package:weather/core/weather/desc_metrics_catalog.dart';
import 'package:weather/core/weather/message.dart';
import 'package:weather/core/weather/status_data.dart';
import 'package:weather/data/mappers/domain_mapper.dart';
import 'package:weather/data/models/db.dart';

void main() {
  setUpAll(() async => initTestEnvironment());

  group('DescMetricsCatalog', () {
    test('includes only metrics with formatted values', () {
      final statusData = StatusData(
        settings: DomainMapper.settingsToDomain(Settings()),
      );
      final metrics = DescMetricsCatalog.build(
        input: const DescMetricsInput(humidity: 55, wind: 3.2),
        statusData: statusData,
        message: Message(),
      ).where((m) => m.hasValue).toList();

      expect(metrics, isNotEmpty);
      expect(metrics.every((m) => m.helpText.isNotEmpty), isTrue);
      expect(metrics.any((m) => m.label.isNotEmpty), isTrue);
    });
  });
}
