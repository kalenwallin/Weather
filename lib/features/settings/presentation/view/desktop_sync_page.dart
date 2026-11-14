import 'package:material_ui/material_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:iconsax_plus/iconsax_plus.dart';
import 'package:weather/core/constants/app_constants.dart';
import 'package:weather/core/widgets/button.dart';
import 'package:weather/features/settings/application/desktop_sync_service.dart';
import 'package:weather/features/settings/presentation/widgets/settings_secondary_app_bar.dart';
import 'package:weather/i18n/tr.dart';

/// Sends the phone's current configuration to a browser's pairing session.
class DesktopSyncPage extends ConsumerStatefulWidget {
  const DesktopSyncPage({super.key});

  @override
  ConsumerState<DesktopSyncPage> createState() => _DesktopSyncPageState();
}

class _DesktopSyncPageState extends ConsumerState<DesktopSyncPage> {
  final _code = TextEditingController();
  bool _sending = false;
  bool _sent = false;
  String? _error;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (_sending) return;
    if (!DesktopSyncService.isValidCode(_code.text)) {
      setState(() => _error = 'desktopSyncInvalidCode'.tr);
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await ref.read(desktopSyncServiceProvider).sendConfiguration(_code.text);
      if (mounted) setState(() => _sent = true);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: SettingsSecondaryAppBar(title: 'syncToDesktop'.tr),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppConstants.spacingL),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(AppConstants.spacingXL),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Icon(
                        _sent
                            ? IconsaxPlusLinear.tick_circle
                            : IconsaxPlusLinear.monitor_mobbile,
                        size: 64,
                        color: theme.colorScheme.primary,
                      ),
                      const SizedBox(height: AppConstants.spacingXL),
                      Text(
                        (_sent
                                ? 'desktopSyncSuccess'
                                : 'desktopSyncInstructions')
                            .tr,
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodyLarge,
                      ),
                      const SizedBox(height: AppConstants.spacingXL),
                      if (!_sent) ...[
                        TextField(
                          controller: _code,
                          enabled: !_sending,
                          textAlign: TextAlign.center,
                          textCapitalization: TextCapitalization.characters,
                          autocorrect: false,
                          enableSuggestions: false,
                          maxLength: 9,
                          inputFormatters: [
                            FilteringTextInputFormatter.allow(
                              RegExp(r'[A-Za-z2-9\-\s]'),
                            ),
                          ],
                          style: theme.textTheme.headlineSmall?.copyWith(
                            letterSpacing: 4,
                          ),
                          decoration: InputDecoration(
                            labelText: 'desktopPairingCode'.tr,
                            hintText: 'ABCD-EFGH',
                            counterText: '',
                            border: const OutlineInputBorder(),
                          ),
                          onSubmitted: (_) => _send(),
                        ),
                        const SizedBox(height: AppConstants.spacingL),
                        MyTextButton(
                          text: 'desktopSyncSend'.tr,
                          isLoading: _sending,
                          onPressed: _send,
                        ),
                      ] else
                        MyTextButton(
                          text: 'desktopSyncAnother'.tr,
                          onPressed: () => setState(() {
                            _sent = false;
                            _code.clear();
                          }),
                        ),
                      if (_error != null) ...[
                        const SizedBox(height: AppConstants.spacingL),
                        Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: theme.colorScheme.error,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppConstants.spacingL),
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppConstants.spacingL,
                ),
                child: Text(
                  'desktopSyncPrivacy'.tr,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
