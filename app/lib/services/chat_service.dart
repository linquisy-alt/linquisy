import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../models/models.dart';

/// All reads and writes to Firestore go through here.
class ChatService {
  ChatService({FirebaseFirestore? db, FirebaseAuth? auth})
      : _db = db ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance;

  final FirebaseFirestore _db;
  final FirebaseAuth _auth;

  User get _me => _auth.currentUser!;
  String get myUid => _me.uid;
  String get myName => _me.displayName ?? _me.email ?? 'Me';

  CollectionReference<Map<String, dynamic>> get _users => _db.collection('users');
  CollectionReference<Map<String, dynamic>> get _chats => _db.collection('chats');

  Future<void> saveProfile({required String name}) async {
    await _me.updateDisplayName(name);
    await _users.doc(myUid).set({
      'name': name,
      'email': _me.email,
      'emailLower': _me.email?.toLowerCase(),
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }

  Future<AppUser?> findUserByEmail(String email) async {
    final q = await _users.where('emailLower', isEqualTo: email.trim().toLowerCase()).limit(1).get();
    return q.docs.isEmpty ? null : AppUser.fromDoc(q.docs.first);
  }

  Stream<List<Chat>> chats() => _chats
      .where('members', arrayContains: myUid)
      .orderBy('updatedAt', descending: true)
      .snapshots()
      .map((s) => s.docs.map(Chat.fromDoc).toList());

  Stream<Chat> chat(String id) => _chats.doc(id).snapshots().map(Chat.fromDoc);

  Stream<List<Message>> messages(String chatId) => _chats
      .doc(chatId)
      .collection('messages')
      .orderBy('createdAt', descending: true)
      .limit(200)
      .snapshots()
      .map((s) => s.docs.map(Message.fromDoc).toList());

  /// Opens the one-to-one chat with [other], creating it the first time.
  Future<String> openDirectChat(AppUser other) async {
    final ids = [myUid, other.uid]..sort();
    final id = 'dm_${ids.join('_')}';
    final ref = _chats.doc(id);
    final snap = await ref.get();
    if (!snap.exists) {
      await ref.set({
        'type': 'direct',
        'members': ids,
        'memberNames': {myUid: myName, other.uid: other.name},
        'createdBy': myUid,
        'botMode': 'auto',
        'updatedAt': FieldValue.serverTimestamp(),
      });
    }
    return id;
  }

  Future<String> createGroup(String name, List<AppUser> people) async {
    final ref = _chats.doc();
    await ref.set({
      'type': 'group',
      'name': name.trim(),
      'members': [myUid, ...people.map((p) => p.uid)],
      'memberNames': {myUid: myName, for (final p in people) p.uid: p.name},
      'admins': [myUid],
      'createdBy': myUid,
      'botMode': 'auto',
      'updatedAt': FieldValue.serverTimestamp(),
    });
    await _system(ref.id, '$myName created the group');
    return ref.id;
  }

  Future<void> addMember(String chatId, AppUser user) async {
    await _chats.doc(chatId).update({
      'members': FieldValue.arrayUnion([user.uid]),
      'memberNames.${user.uid}': user.name,
    });
    await _system(chatId, '$myName added ${user.name}');
  }

  Future<void> leaveGroup(String chatId) async {
    await _system(chatId, '$myName left the group');
    await _chats.doc(chatId).update({'members': FieldValue.arrayRemove([myUid])});
  }

  Future<void> setBotMode(String chatId, BotMode mode) =>
      _chats.doc(chatId).update({'botMode': mode.name});

  Future<void> sendText(String chatId, String text) async {
    final t = text.trim();
    if (t.isEmpty) return;
    final chatRef = _chats.doc(chatId);
    final batch = _db.batch();
    batch.set(chatRef.collection('messages').doc(), {
      'type': 'text',
      'senderId': myUid,
      'senderName': myName,
      'text': t,
      'createdAt': FieldValue.serverTimestamp(),
    });
    batch.update(chatRef, {
      'lastMessage': {'text': t.length > 120 ? '${t.substring(0, 120)}…' : t, 'senderId': myUid},
      'updatedAt': FieldValue.serverTimestamp(),
    });
    await batch.commit();
  }

  Future<void> _system(String chatId, String text) => _chats.doc(chatId).collection('messages').add({
        'type': 'system',
        'senderId': myUid,
        'senderName': myName,
        'text': text,
        'createdAt': FieldValue.serverTimestamp(),
      });
}
