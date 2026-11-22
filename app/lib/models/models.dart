import 'package:cloud_firestore/cloud_firestore.dart';

/// Id the Cloud Function uses for messages posted by the Librarian bot.
const String botId = 'librarian-bot';

class AppUser {
  AppUser({required this.uid, required this.name, required this.email});

  final String uid;
  final String name;
  final String email;

  factory AppUser.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final d = doc.data() ?? const {};
    return AppUser(
      uid: doc.id,
      name: (d['name'] as String?) ?? 'Unknown',
      email: (d['email'] as String?) ?? '',
    );
  }
}

enum BotMode { auto, command, off }

BotMode botModeFrom(String? v) =>
    BotMode.values.firstWhere((m) => m.name == v, orElse: () => BotMode.auto);

class Chat {
  Chat({
    required this.id,
    required this.isGroup,
    required this.name,
    required this.members,
    required this.memberNames,
    required this.lastText,
    required this.updatedAt,
    required this.botMode,
    required this.botTyping,
  });

  final String id;
  final bool isGroup;
  final String? name;
  final List<String> members;
  final Map<String, String> memberNames;
  final String? lastText;
  final DateTime? updatedAt;
  final BotMode botMode;
  final bool botTyping;

  /// Groups show their name; a direct chat shows the other person's name.
  String titleFor(String myUid) {
    if (isGroup) return name ?? 'Group';
    final other = members.firstWhere((m) => m != myUid, orElse: () => myUid);
    return memberNames[other] ?? 'Chat';
  }

  factory Chat.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final d = doc.data() ?? const {};
    final last = d['lastMessage'] as Map<String, dynamic>?;
    return Chat(
      id: doc.id,
      isGroup: d['type'] == 'group',
      name: d['name'] as String?,
      members: List<String>.from(d['members'] as List? ?? const []),
      memberNames: Map<String, String>.from(d['memberNames'] as Map? ?? const {}),
      lastText: last?['text'] as String?,
      updatedAt: (d['updatedAt'] as Timestamp?)?.toDate(),
      botMode: botModeFrom(d['botMode'] as String?),
      botTyping: d['botTyping'] == true,
    );
  }
}

/// One open-access result the bot found.
class PaperResult {
  PaperResult({
    required this.title,
    required this.authors,
    this.year,
    this.doi,
    this.pdfUrl,
    this.landingUrl,
    this.epubUrl,
    this.license,
    required this.source,
    required this.isBook,
  });

  final String title;
  final List<String> authors;
  final int? year;
  final String? doi;
  final String? pdfUrl;
  final String? landingUrl;
  final String? epubUrl;
  final String? license;
  final String source;
  final bool isBook;

  factory PaperResult.fromMap(Map<String, dynamic> m) => PaperResult(
        title: (m['title'] as String?) ?? 'Untitled',
        authors: List<String>.from(m['authors'] as List? ?? const []),
        year: (m['year'] as num?)?.toInt(),
        doi: m['doi'] as String?,
        pdfUrl: m['pdfUrl'] as String?,
        landingUrl: m['landingUrl'] as String?,
        epubUrl: m['epubUrl'] as String?,
        license: m['license'] as String?,
        source: (m['source'] as String?) ?? '',
        isBook: m['kind'] == 'book',
      );
}

class Message {
  Message({
    required this.id,
    required this.type,
    required this.senderId,
    required this.senderName,
    required this.text,
    required this.createdAt,
    required this.results,
  });

  final String id;
  final String type;
  final String senderId;
  final String senderName;
  final String text;
  final DateTime? createdAt;
  final List<PaperResult> results;

  bool get isBot => senderId == botId;
  bool get isSystem => type == 'system';

  factory Message.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final d = doc.data() ?? const {};
    return Message(
      id: doc.id,
      type: (d['type'] as String?) ?? 'text',
      senderId: (d['senderId'] as String?) ?? '',
      senderName: (d['senderName'] as String?) ?? '',
      text: (d['text'] as String?) ?? '',
      createdAt: (d['createdAt'] as Timestamp?)?.toDate(),
      results: (d['results'] as List? ?? const [])
          .whereType<Map>()
          .map((m) => PaperResult.fromMap(Map<String, dynamic>.from(m)))
          .toList(),
    );
  }
}
