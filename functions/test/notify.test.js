'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { recipientsFor, notificationFor } = require('../src/notify');

test('notifies everyone but the sender and people who blocked the sender', () => {
  const chat = { members: ['a', 'b', 'c', 'd'] };
  assert.deepStrictEqual(recipientsFor(chat, 'a', { c: ['a'], d: ['x'] }), ['b', 'd']);
  assert.deepStrictEqual(recipientsFor({ members: ['a'] }, 'a'), []);
});

test('group notifications name the group and sender; direct ones the sender', () => {
  assert.deepStrictEqual(
    notificationFor({ type: 'group', name: 'Lab' }, { senderName: 'Asha', text: 'hello\nall' }),
    { title: 'Lab', body: 'Asha: hello all' },
  );
  assert.deepStrictEqual(notificationFor({ type: 'direct' }, { senderName: 'Asha', text: 'hi' }), { title: 'Asha', body: 'hi' });
  assert.strictEqual(notificationFor({ type: 'direct' }, { text: 'x'.repeat(300) }).body.length, 141);
});
