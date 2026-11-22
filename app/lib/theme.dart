import 'package:material_ui/material_ui.dart';

/// Pagora's own look: deep ink blue with a warm paper accent.
class PagoraTheme {
  static const ink = Color(0xFF1F3A5F);
  static const paper = Color(0xFFE9A23B);

  static ThemeData light() => _base(Brightness.light);
  static ThemeData dark() => _base(Brightness.dark);

  static ThemeData _base(Brightness b) {
    final scheme = ColorScheme.fromSeed(seedColor: ink, brightness: b, tertiary: paper);
    return ThemeData(
      colorScheme: scheme,
      useMaterial3: true,
      appBarTheme: AppBarTheme(
        backgroundColor: b == Brightness.light ? ink : scheme.surfaceContainer,
        foregroundColor: b == Brightness.light ? Colors.white : scheme.onSurface,
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: paper,
        foregroundColor: const Color(0xFF2B1A00),
      ),
    );
  }
}
