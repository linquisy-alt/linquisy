'use strict';

/**
 * Who should get a push notification for a new message: every member except the
 * sender, minus anyone who has blocked the sender.
 * @param {{members?: string[]}} chat
 * @param {string} senderId
 * @param {Record<string, string[]>} blockedByUser uid -> uids that user has blocked
 */
function recipientsFor(chat, senderId, blockedByUser = {}) {
  return (chat.members || []).filter(
    (uid) => uid !== senderId && !(blockedByUser[uid] || []).includes(senderId),
  );
}

/** The notification title and body. Message text is cut short; nothing else is shared. */
function notificationFor(chat, msg) {
  const sender = msg.senderName || 'Someone';
  const text = (msg.text || '').replace(/\s+/g, ' ').trim();
  const body = text.length > 140 ? `${text.slice(0, 140)}…` : text;
  if (chat.type === 'group') {
    return { title: chat.name || 'Group', body: `${sender}: ${body}` };
  }
  return { title: sender, body };
}

module.exports = { recipientsFor, notificationFor };
