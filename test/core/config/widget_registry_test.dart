import 'package:flutter_test/flutter_test.dart';
import 'package:weather/core/config/widget_registry.dart';

void main() {
  group('weatherWidgetRegistry', () {
    test('contains three unique widget definitions', () {
      expect(weatherWidgetRegistry, hasLength(3));
      expect(weatherWidgetRegistry.map((w) => w.id).toSet(), hasLength(3));
    });

    test('every widget has a slang label key and Android class name', () {
      for (final widget in weatherWidgetRegistry) {
        expect(widget.labelKey, isNotEmpty);
        expect(widget.androidName, isNotEmpty);
        expect(widget.qualifiedAndroidName, contains('com.yoshi.weather'));
      }
    });
  });
}
