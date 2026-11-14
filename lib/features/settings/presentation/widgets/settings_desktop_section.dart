import 'package:material_ui/material_ui.dart';
import 'package:iconsax_plus/iconsax_plus.dart';
import 'package:weather/core/navigation/app_router.dart';
import 'package:weather/features/settings/presentation/view/desktop_sync_page.dart';
import 'package:weather/features/settings/presentation/widgets/settings_section.dart';
import 'package:weather/features/settings/presentation/widgets/settings_tile.dart';

class SettingsDesktopSection extends StatelessWidget {
  const SettingsDesktopSection({super.key});

  @override
  Widget build(BuildContext context) => SettingsSection(
    title: 'desktop',
    icon: IconsaxPlusBold.monitor,
    children: [
      SettingsTile(
        leading: const Icon(IconsaxPlusLinear.monitor_mobbile),
        title: 'syncToDesktop',
        subtitle: 'desktopSyncSubtitle',
        onTap: () => context.pushRouteUp(const DesktopSyncPage()),
      ),
    ],
  );
}
