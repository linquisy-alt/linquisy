import 'package:material_ui/material_ui.dart';

/// A coloured circle with initials; the colour is stable for a given name.
class Avatar extends StatelessWidget {
  const Avatar({super.key, required this.name, this.group = false, this.bot = false, this.radius = 22});

  final String name;
  final bool group;
  final bool bot;
  final double radius;

  static const _palette = [
    Color(0xFF3B6EA5), Color(0xFF2E8B74), Color(0xFFB5523B), Color(0xFF7A5BA6),
    Color(0xFFC48A1E), Color(0xFF4F7F3A), Color(0xFFA0456E), Color(0xFF2F6F8F),
  ];

  @override
  Widget build(BuildContext context) {
    final words = name.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList();
    final initials = words.isEmpty ? '?' : words.take(2).map((w) => w[0].toUpperCase()).join();
    final color = bot ? const Color(0xFFE9A23B) : _palette[name.hashCode.abs() % _palette.length];
    return CircleAvatar(
      radius: radius,
      backgroundColor: color,
      foregroundColor: Colors.white,
      child: bot
          ? Icon(Icons.local_library, size: radius)
          : group && words.isEmpty
              ? Icon(Icons.group, size: radius)
              : Text(initials, style: TextStyle(fontSize: radius * 0.7, fontWeight: FontWeight.w600)),
    );
  }
}
