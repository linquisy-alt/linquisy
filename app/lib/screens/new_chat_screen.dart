import 'package:material_ui/material_ui.dart';

import '../models/models.dart';
import '../services/chat_service.dart';
import '../widgets/avatar.dart';
import 'chat_screen.dart';

/// Start a one-to-one chat, or build a group, by finding people by email.
class NewChatScreen extends StatefulWidget {
  const NewChatScreen({super.key});

  @override
  State<NewChatScreen> createState() => _NewChatScreenState();
}

class _NewChatScreenState extends State<NewChatScreen> {
  final _service = ChatService();
  final _email = TextEditingController();
  final _groupName = TextEditingController();
  final List<AppUser> _picked = [];
  bool _group = false;
  bool _busy = false;
  String? _error;

  Future<void> _find() async {
    final email = _email.text.trim();
    if (email.isEmpty) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final user = await _service.findUserByEmail(email);
      if (user == null) {
        setState(() => _error = 'No LinkQuisy account uses $email yet. Ask them to sign up first.');
      } else if (user.uid == _service.myUid) {
        setState(() => _error = "That's you.");
      } else if (_group) {
        if (!_picked.any((p) => p.uid == user.uid)) setState(() => _picked.add(user));
        _email.clear();
      } else {
        final id = await _service.openDirectChat(user);
        if (!mounted) return;
        Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => ChatScreen(chatId: id)));
      }
    } catch (e) {
      setState(() => _error = 'Something went wrong: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _createGroup() async {
    if (_groupName.text.trim().isEmpty || _picked.isEmpty) {
      setState(() => _error = 'Give the group a name and add at least one person.');
      return;
    }
    setState(() => _busy = true);
    final id = await _service.createGroup(_groupName.text, _picked);
    if (!mounted) return;
    Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => ChatScreen(chatId: id)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_group ? 'New group' : 'New chat')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SegmentedButton<bool>(
            segments: const [
              ButtonSegment(value: false, icon: Icon(Icons.person), label: Text('Person')),
              ButtonSegment(value: true, icon: Icon(Icons.group), label: Text('Group')),
            ],
            selected: {_group},
            onSelectionChanged: (s) => setState(() => _group = s.first),
          ),
          const SizedBox(height: 16),
          if (_group)
            TextField(
              controller: _groupName,
              decoration: const InputDecoration(labelText: 'Group name', prefixIcon: Icon(Icons.group)),
            ),
          TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            onSubmitted: (_) => _find(),
            decoration: InputDecoration(
              labelText: _group ? 'Add member by email' : 'Their email',
              prefixIcon: const Icon(Icons.alternate_email),
              suffixIcon: IconButton(
                icon: Icon(_group ? Icons.person_add : Icons.arrow_forward),
                onPressed: _busy ? null : _find,
              ),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          if (_group) ...[
            const SizedBox(height: 12),
            for (final p in _picked)
              ListTile(
                leading: Avatar(name: p.name),
                title: Text(p.name),
                subtitle: Text(p.email),
                trailing: IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => setState(() => _picked.remove(p)),
                ),
              ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: _busy ? null : _createGroup,
              icon: const Icon(Icons.check),
              label: const Text('Create group'),
            ),
          ],
        ],
      ),
    );
  }
}
