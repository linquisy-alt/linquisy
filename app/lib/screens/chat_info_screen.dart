import 'package:material_ui/material_ui.dart';

import '../models/models.dart';
import '../services/chat_service.dart';
import '../widgets/avatar.dart';
import '../widgets/report_sheet.dart';

class ChatInfoScreen extends StatelessWidget {
  const ChatInfoScreen({super.key, required this.chatId});

  final String chatId;

  Future<void> _addMember(BuildContext context, ChatService service) async {
    final ctrl = TextEditingController();
    final email = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add member'),
        content: TextField(
          controller: ctrl,
          autofocus: true,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(labelText: 'Email'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, ctrl.text), child: const Text('Add')),
        ],
      ),
    );
    if (email == null || email.trim().isEmpty) return;
    final user = await service.findUserByEmail(email);
    if (!context.mounted) return;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('No account uses $email yet.')));
      return;
    }
    await service.addMember(chatId, user);
  }

  @override
  Widget build(BuildContext context) {
    final service = ChatService();
    return StreamBuilder<Chat>(
      stream: service.chat(chatId),
      builder: (context, snap) {
        final chat = snap.data;
        if (chat == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));
        final title = chat.titleFor(service.myUid);
        return Scaffold(
          appBar: AppBar(title: Text(chat.isGroup ? 'Group info' : 'Chat info')),
          body: ListView(children: [
            const SizedBox(height: 24),
            Center(child: Avatar(name: title, group: chat.isGroup, radius: 44)),
            const SizedBox(height: 12),
            Center(child: Text(title, style: Theme.of(context).textTheme.titleLarge)),
            const SizedBox(height: 24),
            ListTile(
              leading: const Avatar(name: 'Librarian', bot: true, radius: 18),
              title: const Text('Librarian bot'),
              subtitle: const Text(
                'Finds legal open-access PDFs from Unpaywall, OpenAlex, Europe PMC, arXiv, DOAJ, CORE, '
                'OAPEN, DOAB and Project Gutenberg. It never uses piracy sites.',
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: SegmentedButton<BotMode>(
                segments: const [
                  ButtonSegment(value: BotMode.auto, label: Text('Auto')),
                  ButtonSegment(value: BotMode.command, label: Text('/find only')),
                  ButtonSegment(value: BotMode.off, label: Text('Off')),
                ],
                selected: {chat.botMode},
                onSelectionChanged: (s) => service.setBotMode(chatId, s.first),
              ),
            ),
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Text(
                'Auto: answers DOIs, arXiv/PubMed IDs, ISBNs, quoted titles and requests like "pdf of …". '
                '/find only: answers only messages that start with /find.',
                style: TextStyle(fontSize: 12),
              ),
            ),
            if (!chat.isGroup) ..._directActions(context, service, chat),
            if (chat.isGroup) ...[
              const Divider(height: 32),
              ListTile(
                title: Text('${chat.members.length} members', style: Theme.of(context).textTheme.titleSmall),
              ),
              ListTile(
                leading: const CircleAvatar(child: Icon(Icons.person_add)),
                title: const Text('Add member'),
                onTap: () => _addMember(context, service),
              ),
              for (final uid in chat.members)
                ListTile(
                  leading: Avatar(name: chat.memberNames[uid] ?? '?'),
                  title: Text(uid == service.myUid ? 'You' : (chat.memberNames[uid] ?? 'Member')),
                  trailing: uid == service.myUid
                      ? null
                      : PopupMenuButton<String>(
                          onSelected: (v) => v == 'report'
                              ? reportFlow(context, chatId: chatId, uid: uid)
                              : blockFlow(context, uid: uid, name: chat.memberNames[uid] ?? 'this person'),
                          itemBuilder: (_) => const [
                            PopupMenuItem(value: 'report', child: Text('Report')),
                            PopupMenuItem(value: 'block', child: Text('Block')),
                          ],
                        ),
                ),
              ListTile(
                leading: Icon(Icons.logout, color: Theme.of(context).colorScheme.error),
                title: Text('Leave group', style: TextStyle(color: Theme.of(context).colorScheme.error)),
                onTap: () async {
                  await service.leaveGroup(chatId);
                  if (context.mounted) Navigator.of(context).popUntil((r) => r.isFirst);
                },
              ),
            ],
          ]),
        );
      },
    );
  }

  List<Widget> _directActions(BuildContext context, ChatService service, Chat chat) {
    final other = chat.members.firstWhere((m) => m != service.myUid, orElse: () => '');
    if (other.isEmpty) return const [];
    final name = chat.memberNames[other] ?? 'this person';
    final error = Theme.of(context).colorScheme.error;
    return [
      const Divider(height: 32),
      StreamBuilder<Set<String>>(
        stream: service.blocked(),
        builder: (context, snap) {
          final isBlocked = snap.data?.contains(other) ?? false;
          return ListTile(
            leading: Icon(Icons.block, color: error),
            title: Text(isBlocked ? 'Unblock $name' : 'Block $name', style: TextStyle(color: error)),
            onTap: () => isBlocked ? service.unblock(other) : blockFlow(context, uid: other, name: name),
          );
        },
      ),
      ListTile(
        leading: Icon(Icons.flag, color: error),
        title: Text('Report $name', style: TextStyle(color: error)),
        onTap: () => reportFlow(context, chatId: chatId, uid: other),
      ),
    ];
  }
}
