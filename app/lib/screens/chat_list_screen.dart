import 'package:firebase_auth/firebase_auth.dart';
import 'package:intl/intl.dart';
import 'package:material_ui/material_ui.dart';

import '../models/models.dart';
import '../services/chat_service.dart';
import '../widgets/avatar.dart';
import 'chat_screen.dart';
import 'new_chat_screen.dart';

class ChatListScreen extends StatelessWidget {
  const ChatListScreen({super.key});

  String _when(DateTime? t) {
    if (t == null) return '';
    final now = DateTime.now();
    if (now.difference(t).inDays == 0 && now.day == t.day) return DateFormat.Hm().format(t);
    if (now.difference(t).inDays < 7) return DateFormat.E().format(t);
    return DateFormat.yMd().format(t);
  }

  @override
  Widget build(BuildContext context) {
    final service = ChatService();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Inkwell'),
        actions: [
          PopupMenuButton<String>(
            onSelected: (v) async {
              if (v == 'out') await FirebaseAuth.instance.signOut();
            },
            itemBuilder: (_) => [
              PopupMenuItem(enabled: false, child: Text(service.myName)),
              const PopupMenuItem(value: 'out', child: Text('Sign out')),
            ],
          ),
        ],
      ),
      body: StreamBuilder<List<Chat>>(
        stream: service.chats(),
        builder: (context, snap) {
          if (snap.hasError) return Center(child: Text('Could not load chats: ${snap.error}'));
          if (!snap.hasData) return const Center(child: CircularProgressIndicator());
          final chats = snap.data!;
          if (chats.isEmpty) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Text('No chats yet. Tap the pencil to message someone or start a group.',
                    textAlign: TextAlign.center),
              ),
            );
          }
          return ListView.separated(
            itemCount: chats.length,
            separatorBuilder: (_, _) => const Divider(height: 1, indent: 72),
            itemBuilder: (context, i) {
              final c = chats[i];
              final title = c.titleFor(service.myUid);
              return ListTile(
                leading: Avatar(name: title, group: c.isGroup),
                title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
                subtitle: Text(c.botTyping ? 'Librarian is searching…' : (c.lastText ?? ''),
                    maxLines: 1, overflow: TextOverflow.ellipsis),
                trailing: Text(_when(c.updatedAt), style: Theme.of(context).textTheme.bodySmall),
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => ChatScreen(chatId: c.id)),
                ),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        tooltip: 'New chat',
        onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const NewChatScreen())),
        child: const Icon(Icons.edit),
      ),
    );
  }
}
