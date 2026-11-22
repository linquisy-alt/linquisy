import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:material_ui/material_ui.dart';

import '../screens/chat_screen.dart';

/// Registers this phone for new-message notifications and opens the right chat when one is tapped.
class PushService {
  PushService._();

  static final navigatorKey = GlobalKey<NavigatorState>();
  static final _fcm = FirebaseMessaging.instance;
  static String? _token;
  static bool _listening = false;

  static DocumentReference<Map<String, dynamic>> _tokenDoc(String uid, String token) =>
      FirebaseFirestore.instance.collection('users').doc(uid).collection('tokens').doc(token);

  /// Call once after sign-in.
  static Future<void> start() async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;
    try {
      final settings = await _fcm.requestPermission();
      if (settings.authorizationStatus == AuthorizationStatus.denied) return;
      if (!_listening) {
        _listening = true;
        // The app instance's Firebase Installation ID (FID) is what the server sends to.
        _fcm.onRegistered.listen((fid) async {
          _token = fid;
          final u = FirebaseAuth.instance.currentUser?.uid;
          if (u != null) await _save(u, fid);
        });
        final initial = await _fcm.getInitialMessage();
        if (initial != null) _open(initial);
        FirebaseMessaging.onMessageOpenedApp.listen(_open);
      }
      await _fcm.register();
      if (_token != null) await _save(uid, _token!);
    } catch (e) {
      // Notifications are optional: a missing Play Services or APNs setup must not break the app.
      debugPrint('Push setup skipped: $e');
    }
  }

  /// Call before sign-out so this phone stops getting the old account's messages.
  static Future<void> stop() async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    final t = _token;
    if (uid == null || t == null) return;
    try {
      await _tokenDoc(uid, t).delete();
      await _fcm.unregister();
    } catch (_) {}
    _token = null;
  }

  static Future<void> _save(String uid, String token) =>
      _tokenDoc(uid, token).set({'platform': defaultTargetPlatform.name, 'updatedAt': FieldValue.serverTimestamp()});

  static void _open(RemoteMessage m) {
    final chatId = m.data['chatId'];
    if (chatId is! String) return;
    navigatorKey.currentState?.push(MaterialPageRoute(builder: (_) => ChatScreen(chatId: chatId)));
  }
}
