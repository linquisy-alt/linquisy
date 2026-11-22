import 'package:intl/intl.dart';
import 'package:material_ui/material_ui.dart';

import '../models/models.dart';
import '../services/chat_service.dart';
import '../widgets/avatar.dart';
import '../widgets/paper_card.dart';
import 'chat_info_screen.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key, required this.chatId});

  final String chatId;

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _service = ChatService();
  final _input = TextEditingController();

  Future<void> _send() async {
    final text = _input.text;
    if (text.trim().isEmpty) return;
    _input.clear();
    try {
      await _service.sendText(widget.chatId, text);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Not sent: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<Chat>(
      stream: _service.chat(widget.chatId),
      builder: (context, chatSnap) {
        final chat = chatSnap.data;
        final title = chat?.titleFor(_service.myUid) ?? '';
        return Scaffold(
          appBar: AppBar(
            titleSpacing: 0,
            title: InkWell(
              onTap: chat == null
                  ? null
                  : () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => ChatInfoScreen(chatId: widget.chatId)),
                      ),
              child: Row(children: [
                Avatar(name: title, group: chat?.isGroup ?? false, radius: 18),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
                    Text(
                      chat == null
                          ? ''
                          : chat.botTyping
                              ? 'Librarian is searching open-access sources…'
                              : chat.isGroup
                                  ? '${chat.members.length} members'
                                  : 'Librarian: ${_modeLabel(chat.botMode)}',
                      style: const TextStyle(fontSize: 12),
                    ),
                  ]),
                ),
              ]),
            ),
          ),
          body: Column(children: [
            Expanded(
              child: StreamBuilder<List<Message>>(
                stream: _service.messages(widget.chatId),
                builder: (context, snap) {
                  if (snap.hasError) return Center(child: Text('${snap.error}'));
                  if (!snap.hasData) return const Center(child: CircularProgressIndicator());
                  final msgs = snap.data!;
                  if (msgs.isEmpty) return const _EmptyHint();
                  return ListView.builder(
                    reverse: true,
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                    itemCount: msgs.length,
                    itemBuilder: (context, i) => _Bubble(
                      message: msgs[i],
                      mine: msgs[i].senderId == _service.myUid,
                      showName: (chat?.isGroup ?? false) &&
                          (i == msgs.length - 1 || msgs[i + 1].senderId != msgs[i].senderId),
                    ),
                  );
                },
              ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(8, 4, 8, 8),
                child: Row(children: [
                  Expanded(
                    child: TextField(
                      controller: _input,
                      minLines: 1,
                      maxLines: 5,
                      maxLength: 4000,
                      textCapitalization: TextCapitalization.sentences,
                      decoration: InputDecoration(
                        counterText: '',
                        hintText: 'Message, a DOI, or /find a title',
                        filled: true,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  IconButton.filled(onPressed: _send, icon: const Icon(Icons.send)),
                ]),
              ),
            ),
          ]),
        );
      },
    );
  }
}

String _modeLabel(BotMode m) => switch (m) {
      BotMode.auto => 'listening for papers',
      BotMode.command => '/find only',
      BotMode.off => 'off',
    };

class _EmptyHint extends StatelessWidget {
  const _EmptyHint();

  @override
  Widget build(BuildContext context) => const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Text(
            'Say hello!\n\nTip: paste a DOI, an arXiv or PubMed ID, or write "pdf of <title>" '
            'and the Librarian will post a legal open-access copy if one exists.',
            textAlign: TextAlign.center,
          ),
        ),
      );
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message, required this.mine, required this.showName});

  final Message message;
  final bool mine;
  final bool showName;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    if (message.isSystem) {
      return Center(
        child: Container(
          margin: const EdgeInsets.symmetric(vertical: 6),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(color: scheme.surfaceContainerHigh, borderRadius: BorderRadius.circular(12)),
          child: Text(message.text, style: Theme.of(context).textTheme.bodySmall),
        ),
      );
    }
    final time = message.createdAt == null ? '' : DateFormat.Hm().format(message.createdAt!);
    final bg = message.isBot
        ? scheme.tertiaryContainer
        : mine
            ? scheme.primaryContainer
            : scheme.surfaceContainerHighest;
    final fg = message.isBot
        ? scheme.onTertiaryContainer
        : mine
            ? scheme.onPrimaryContainer
            : scheme.onSurface;
    final bubble = Container(
      constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * 0.8),
      margin: const EdgeInsets.symmetric(vertical: 2),
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.only(
          topLeft: const Radius.circular(16),
          topRight: const Radius.circular(16),
          bottomLeft: Radius.circular(mine ? 16 : 4),
          bottomRight: Radius.circular(mine ? 4 : 16),
        ),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
        if (showName || message.isBot)
          Padding(
            padding: const EdgeInsets.only(bottom: 2),
            child: Text(message.isBot ? 'Librarian' : message.senderName,
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: message.isBot ? fg : scheme.primary)),
          ),
        if (message.results.isEmpty) Text(message.text, style: TextStyle(color: fg)),
        for (final r in message.results) PaperCard(result: r),
        Align(
          alignment: Alignment.bottomRight,
          child: Text(time, style: TextStyle(fontSize: 11, color: fg.withValues(alpha: 0.6))),
        ),
      ]),
    );
    return Row(
      mainAxisAlignment: mine ? MainAxisAlignment.end : MainAxisAlignment.start,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        if (message.isBot) ...[const Avatar(name: 'Librarian', bot: true, radius: 14), const SizedBox(width: 6)],
        Flexible(child: bubble),
      ],
    );
  }
}
