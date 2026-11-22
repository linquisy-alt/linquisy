'use strict';

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const crypto = require('crypto');

const { detect } = require('./src/detect');
const { lookup } = require('./src/resolve');
const { formatReply } = require('./src/format');

admin.initializeApp();
const db = admin.firestore();

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
  const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + CACHE_DAYS * 864e5);
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
      const now = admin.firestore.FieldValue.serverTimestamp();
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
