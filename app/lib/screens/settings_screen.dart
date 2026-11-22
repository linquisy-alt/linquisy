import 'package:firebase_auth/firebase_auth.dart';
import 'package:material_ui/material_ui.dart';

import '../services/chat_service.dart';
import '../services/push_service.dart';
import '../widgets/avatar.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _service = ChatService();
  bool _busy = false;

  Future<void> _signOut() async {
    await PushService.stop();
    await FirebaseAuth.instance.signOut();
    if (mounted) Navigator.of(context).popUntil((r) => r.isFirst);
  }

  Future<void> _rename() async {
    final ctrl = TextEditingController(text: _service.myName);
    final name = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Your name'),
        content: TextField(controller: ctrl, autofocus: true),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, ctrl.text.trim()), child: const Text('Save')),
        ],
      ),
    );
    if (name == null || name.isEmpty) return;
    await _service.saveProfile(name: name);
    if (mounted) setState(() {});
  }

  Future<void> _delete() async {
    final sure = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete your account?'),
        content: const Text(
          'This permanently deletes your profile and removes you from all chats. '
          'Messages you already sent in groups stay visible to the other members. This cannot be undone.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Theme.of(ctx).colorScheme.error),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete account'),
          ),
        ],
      ),
    );
    if (sure != true) return;
    setState(() => _busy = true);
    try {
      await PushService.stop();
      await _service.deleteAccount();
      if (mounted) Navigator.of(context).popUntil((r) => r.isFirst);
    } catch (e) {
      if (mounted) {
        setState(() => _busy = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not delete the account: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    final error = Theme.of(context).colorScheme.error;
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: AbsorbPointer(
        absorbing: _busy,
        child: ListView(children: [
          const SizedBox(height: 16),
          ListTile(
            leading: Avatar(name: _service.myName),
            title: Text(_service.myName),
            subtitle: Text(user?.email ?? ''),
            trailing: const Icon(Icons.edit),
            onTap: _rename,
          ),
          const Divider(),
          ListTile(leading: const Icon(Icons.logout), title: const Text('Sign out'), onTap: _signOut),
          ListTile(
            leading: Icon(Icons.delete_forever, color: error),
            title: Text('Delete account', style: TextStyle(color: error)),
            subtitle: _busy ? const LinearProgressIndicator() : null,
            onTap: _delete,
          ),
        ]),
      ),
    );
  }
}
