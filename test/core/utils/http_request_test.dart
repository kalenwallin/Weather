import 'dart:async';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:weather/core/utils/http_request.dart';

class _StalledAdapter implements HttpClientAdapter {
  bool cancelled = false;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) {
    cancelFuture?.then((_) => cancelled = true);
    return Completer<ResponseBody>().future;
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  testWidgets('stalled requests time out and cancel the connection', (
    tester,
  ) async {
    final adapter = _StalledAdapter();
    final dio = Dio()..httpClientAdapter = adapter;
    addTearDown(() => dio.close(force: true));
    final result = getWithDeadline(dio, 'https://example.invalid');
    final expectation = expectLater(result, throwsA(isA<TimeoutException>()));

    await tester.pump();
    await tester.pump(const Duration(seconds: 15));
    await expectation;

    expect(adapter.cancelled, isTrue);
  });

  test('successful requests preserve response data and options', () async {
    final dio = Dio();
    addTearDown(() => dio.close(force: true));
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          expect(options.headers['User-Agent'], 'Weather test');
          handler.resolve(
            Response(requestOptions: options, data: {'ok': true}),
          );
        },
      ),
    );

    final response = await getWithDeadline(
      dio,
      'https://example.invalid',
      options: Options(headers: {'User-Agent': 'Weather test'}),
    );

    expect(response.data, {'ok': true});
  });
}
