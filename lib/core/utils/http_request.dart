import 'dart:async';

import 'package:dio/dio.dart';

/// Bounds the whole request, including DNS and a stalled response body.
/// Cancelling also releases the underlying connection after the deadline.
Future<Response<T>> getWithDeadline<T>(
  Dio dio,
  String path, {
  Options? options,
  Duration timeout = const Duration(seconds: 15),
}) async {
  final cancelToken = CancelToken();
  return dio
      .get<T>(path, options: options, cancelToken: cancelToken)
      .timeout(
        timeout,
        onTimeout: () {
          cancelToken.cancel('Request deadline exceeded');
          throw TimeoutException('Request deadline exceeded', timeout);
        },
      );
}
