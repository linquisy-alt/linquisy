import 'package:material_ui/material_ui.dart';

import '../models/models.dart';
import '../services/chat_service.dart';

const _reasons = ['Spam', 'Harassment or bullying', 'Hate speech', 'Sexual content', 'Violence or threats', 'Other'];

/// Long-press menu on someone else's message: report the message, block the sender.
Future<void> showMessageActions(BuildContext context, {required String chatId, required Message message}) {
  final service = ChatService();
  return showModalBottomSheet<void>(
    context: context,
    builder: (ctx) => SafeArea(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        ListTile(
          leading: const Icon(Icons.flag),
          title: const Text('Report message'),
          onTap: () async {
            Navigator.pop(ctx);
            await reportFlow(context, chatId: chatId, uid: message.senderId, message: message);
          },
        ),
        ListTile(
          leading: const Icon(Icons.block),
          title: Text('Block ${message.senderName}'),
          onTap: () async {
            Navigator.pop(ctx);
            await blockFlow(context, uid: message.senderId, name: message.senderName, service: service);
          },
        ),
      ]),
    ),
  );
}

Future<void> reportFlow(BuildContext context, {required String chatId, required String uid, Message? message}) async {
  final reason = await showDialog<String>(
    context: context,
    builder: (ctx) => SimpleDialog(
      title: Text(message == null ? 'Report this person' : 'Report this message'),
      children: [
        for (final r in _reasons) SimpleDialogOption(onPressed: () => Navigator.pop(ctx, r), child: Text(r)),
      ],
    ),
  );
  if (reason == null) return;
  await ChatService().report(chatId: chatId, reportedUid: uid, reason: reason, message: message);
  if (context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Thanks. The report was sent and will be reviewed.')),
    );
  }
}

Future<void> blockFlow(BuildContext context, {required String uid, required String name, ChatService? service}) async {
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text('Block $name?'),
      content: const Text(
        "You won't see their messages in groups, they can't message you directly, "
        "and you won't get notifications from them. You can unblock them later in the chat info.",
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
        FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Block')),
      ],
    ),
  );
  if (ok == true) await (service ?? ChatService()).block(uid);
}
