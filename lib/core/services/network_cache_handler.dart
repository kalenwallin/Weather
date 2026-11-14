import 'package:weather/core/services/connectivity_service.dart';
import 'package:weather/core/utils/debug_log.dart';

/// Chooses between a network fetch and falling back to cached data.
class NetworkCacheHandler {
  const NetworkCacheHandler._();

  /// Fetches when online; on offline or error, runs [onUseCache] and returns false.
  static Future<bool> fetchOrKeepCache({
    required Future<void> Function() onNetworkFetch,
    required Future<void> Function() onUseCache,
    Future<bool> Function()? hasInternet,
    void Function()? onOffline,
    void Function()? onError,
  }) async {
    final checkInternet = hasInternet ?? ConnectivityService.hasInternet;
    if (!await checkInternet()) {
      onOffline?.call();
      await onUseCache();
      return false;
    }
    try {
      await onNetworkFetch();
      return true;
    } catch (error, stackTrace) {
      debugLogError('NetworkCacheHandler.fetchOrKeepCache', error, stackTrace);
      onError?.call();
      await onUseCache();
      return false;
    }
  }
}
