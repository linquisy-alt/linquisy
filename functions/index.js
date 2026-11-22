'use strict';

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const logger = require('firebase-functions/logger');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getMessaging } = require('firebase-admin/messaging');
const crypto = require('crypto');

const { detect } = require('./src/detect');
const { lookup } = require('./src/resolve');
const { formatReply } = require('./src/format');
const { recipientsFor, notificationFor } = require('./src/notify');

initializeApp();
const db = getFirestore();

// Pick a region close to your users, e.g. asia-south1 (Mumbai).
setGlobalOptions({ region: process.env.FUNCTION_REGION || 'asia-south1', maxInstances: 10 });

const BOT_ID = 'librarian-bot';
const CACHE_DAYS = 7;
const MAX_LOOKUPS_PER_CHAT_PER_HOUR = 60;

async function cachedLookup(item, messageText) {
  const id = crypto.createHash('sha1').update(`${item.kind}:${item.value.toLowerCase()}:${item.explicit}`).digest('hex');
  const ref = db.collection('oaCache').doc(id);
  const snap = await ref.get();
  if (snap.exists && snap.get('expiresAt').toMillis() > Date.now()) return snap.get('outcome');
  const outcome = await lookup(item, { messageText });
  const expiresAt = Timestamp.fromMillis(Date.now() + CACHE_DAYS * 864e5);
  // Firestore rejects undefined values, so round-trip through JSON.
  await ref.set({ outcome: JSON.parse(JSON.stringify(outcome)), expiresAt });
  return outcome;
}

/** A simple per-chat hourly budget so one busy group can't exhaust the free API quotas. */
async function takeBudget(chatId, n) {
  const hour = new Date().toISOString().slice(0, 13);
  const ref = db.collection('chats').doc(chatId).collection('botUsage').doc(hour);
  return db.runTransaction(async (tx) => {
    const used = (await tx.get(ref)).get('count') || 0;
    if (used + n > MAX_LOOKUPS_PER_CHAT_PER_HOUR) return false;
    tx.set(ref, { count: used + n }, { merge: true });
    return true;
  });
}

exports.librarianBot = onDocumentCreated(
  { document: 'chats/{chatId}/messages/{messageId}', timeoutSeconds: 60, memory: '256MiB' },
  async (event) => {
    const msg = event.data && event.data.data();
    if (!msg || msg.senderId === BOT_ID || msg.type !== 'text') return;
    const { chatId, messageId } = event.params;

    const chat = (await db.collection('chats').doc(chatId).get()).data() || {};
    const mode = chat.botMode || 'auto';
    const items = detect(msg.text || '', { mode });
    if (!items.length) return;
    if (!(await takeBudget(chatId, items.length))) {
      logger.warn('Bot budget reached', { chatId });
      return;
    }

    const chatRef = db.collection('chats').doc(chatId);
    await chatRef.update({ botTyping: true }).catch(() => {});
    try {
      const outcomes = [];
      for (const item of items) outcomes.push({ item, outcome: await cachedLookup(item, msg.text) });
      const reply = formatReply(outcomes);
      if (!reply) return;
      const now = FieldValue.serverTimestamp();
      await chatRef.collection('messages').add({
        type: 'bot',
        senderId: BOT_ID,
        senderName: 'Librarian',
        text: reply.text,
        results: JSON.parse(JSON.stringify(reply.results)),
        replyTo: messageId,
        createdAt: now,
      });
      await chatRef.update({
        lastMessage: { text: `Librarian: ${reply.text.split('\n')[0]}`.slice(0, 120), senderId: BOT_ID, createdAt: now },
        updatedAt: now,
      });
    } catch (err) {
      logger.error('Lookup failed', err);
    } finally {
      await chatRef.update({ botTyping: false }).catch(() => {});
    }
  },
);

/** Push a notification to the other members' phones for every new chat message. */
exports.notifyMembers = onDocumentCreated(
  { document: 'chats/{chatId}/messages/{messageId}', memory: '256MiB' },
  async (event) => {
    const msg = event.data && event.data.data();
    if (!msg || !['text', 'bot'].includes(msg.type)) return;
    const { chatId } = event.params;
    const chat = (await db.collection('chats').doc(chatId).get()).data();
    if (!chat) return;

    const others = (chat.members || []).filter((uid) => uid !== msg.senderId);
    if (!others.length) return;
    const profiles = await db.getAll(...others.map((uid) => db.collection('users').doc(uid)));
    const blockedBy = Object.fromEntries(profiles.map((p) => [p.id, p.get('blocked') || []]));
    const recipients = recipientsFor(chat, msg.senderId, blockedBy);

    const tokenDocs = (
      await Promise.all(recipients.map((uid) => db.collection('users').doc(uid).collection('tokens').get()))
    ).flatMap((s) => s.docs);
    if (!tokenDocs.length) return;

    const { title, body } = notificationFor(chat, msg);
    const res = await getMessaging().sendEachForMulticast({
      fids: tokenDocs.map((d) => d.id), // Firebase Installation IDs registered by the app
      notification: { title, body },
      data: { chatId },
      android: { priority: 'high', notification: { tag: chatId } },
      apns: { payload: { aps: { sound: 'default', threadId: chatId } } },
    });
    // Forget tokens for uninstalled apps so we stop sending to them.
    const stale = [];
    res.responses.forEach((r, i) => {
      const code = r.error && r.error.code;
      if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
        stale.push(tokenDocs[i].ref.delete());
      }
    });
    await Promise.all(stale);
  },
);

/**
 * Deletes the caller's account: removes them from every chat, deletes their profile and
 * notification tokens, then deletes the sign-in account. Messages they already sent in
 * groups stay visible to the other members (said so in the privacy policy).
 */
exports.deleteMyAccount = onCall(async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in first.');
  const userRef = db.collection('users').doc(uid);
  const name = (await userRef.get()).get('name') || 'A member';

  const chats = await db.collection('chats').where('members', 'array-contains', uid).get();
  for (const c of chats.docs) {
    const batch = db.batch();
    batch.update(c.ref, {
      members: FieldValue.arrayRemove(uid),
      [`memberNames.${uid}`]: 'Deleted account',
    });
    if (c.get('type') === 'group') {
      batch.set(c.ref.collection('messages').doc(), {
        type: 'system',
        senderId: uid,
        senderName: name,
        text: `${name} deleted their account`,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }

  await db.recursiveDelete(userRef); // profile + tokens
  await getAuth().deleteUser(uid);
  logger.info('Account deleted', { uid, chats: chats.size });
  return { ok: true };
});
