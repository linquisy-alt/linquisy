'use strict';
// Firestore security rules tests. Run with `npm test` from this folder (starts the emulator).
const test = require('node:test');
const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, addDoc, collection, query, where, getDocs, serverTimestamp, arrayUnion } = require('firebase/firestore');

let env;
const DM = 'dm_alice_bob';

test.before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-linquisy',
    firestore: { rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8') },
  });
});
test.after(() => env.cleanup());
test.beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/alice'), { name: 'Alice', email: 'a@x.org', emailLower: 'a@x.org' });
    await setDoc(doc(db, 'users/bob'), { name: 'Bob', email: 'b@x.org', emailLower: 'b@x.org' });
    await setDoc(doc(db, 'users/carol'), { name: 'Carol', email: 'c@x.org', emailLower: 'c@x.org' });
    await setDoc(doc(db, `chats/${DM}`), { type: 'direct', members: ['alice', 'bob'], createdBy: 'alice', updatedAt: new Date() });
    await setDoc(doc(db, 'chats/g1'), { type: 'group', name: 'Lab', members: ['alice', 'bob'], createdBy: 'alice', updatedAt: new Date() });
  });
});

const as = (uid) => env.authenticatedContext(uid).firestore();
const msg = (uid, text = 'hi') => ({ type: 'text', senderId: uid, senderName: uid, text, createdAt: serverTimestamp() });

test('members can read and post; outsiders cannot', async () => {
  await assertSucceeds(getDoc(doc(as('alice'), `chats/${DM}`)));
  await assertSucceeds(addDoc(collection(as('bob'), `chats/${DM}/messages`), msg('bob')));
  await assertFails(getDoc(doc(as('carol'), `chats/${DM}`)));
  await assertFails(addDoc(collection(as('carol'), 'chats/g1/messages'), msg('carol')));
  await assertFails(getDocs(collection(as('carol'), 'chats/g1/messages')));
});

test('chat list query only returns your chats', async () => {
  await assertSucceeds(getDocs(query(collection(as('alice'), 'chats'), where('members', 'array-contains', 'alice'))));
  await assertFails(getDocs(collection(as('alice'), 'chats')));
});

test('nobody can fake Librarian messages or another sender', async () => {
  await assertFails(addDoc(collection(as('alice'), 'chats/g1/messages'), { ...msg('alice'), type: 'bot', senderId: 'librarian-bot' }));
  await assertFails(addDoc(collection(as('alice'), 'chats/g1/messages'), msg('bob')));
  await assertFails(updateDoc(doc(as('alice'), 'chats/g1'), { botTyping: true }));
});

test('a direct chat can be created only with the dm_ id and you in it', async () => {
  await assertSucceeds(getDoc(doc(as('carol'), 'chats/dm_bob_carol'))); // checking it doesn't exist yet
  await assertSucceeds(setDoc(doc(as('carol'), 'chats/dm_bob_carol'), { type: 'direct', members: ['bob', 'carol'], createdBy: 'carol', updatedAt: serverTimestamp() }));
  await assertFails(setDoc(doc(as('carol'), 'chats/dm_alice_bob2'), { type: 'direct', members: ['alice', 'bob'], createdBy: 'carol' }));
  await assertFails(updateDoc(doc(as('alice'), `chats/${DM}`), { members: ['alice', 'bob', 'carol'] }));
});

test('blocking stops direct messages from the blocked person, not in groups', async () => {
  await assertSucceeds(updateDoc(doc(as('alice'), 'users/alice'), { blocked: arrayUnion('bob') }));
  await assertFails(addDoc(collection(as('bob'), `chats/${DM}/messages`), msg('bob')));
  await assertSucceeds(addDoc(collection(as('alice'), `chats/${DM}/messages`), msg('alice')));
  await assertSucceeds(addDoc(collection(as('bob'), 'chats/g1/messages'), msg('bob'))); // hidden for Alice in the app
});

test('profiles: only your own, only known fields', async () => {
  await assertFails(updateDoc(doc(as('bob'), 'users/alice'), { name: 'Hacked' }));
  await assertFails(updateDoc(doc(as('alice'), 'users/alice'), { isAdmin: true }));
  await assertFails(updateDoc(doc(as('alice'), 'users/alice'), { blocked: 'bob' }));
});

test('notification tokens are private to their owner', async () => {
  await assertSucceeds(setDoc(doc(as('alice'), 'users/alice/tokens/fid1'), { platform: 'android' }));
  await assertFails(getDoc(doc(as('bob'), 'users/alice/tokens/fid1')));
  await assertFails(setDoc(doc(as('bob'), 'users/alice/tokens/fid2'), { platform: 'android' }));
});

test('reports are write-only and carry the real reporter', async () => {
  const r = { reporterId: 'alice', reportedUid: 'bob', chatId: 'g1', reason: 'Spam', createdAt: serverTimestamp() };
  await assertSucceeds(addDoc(collection(as('alice'), 'reports'), r));
  await assertFails(addDoc(collection(as('alice'), 'reports'), { ...r, reporterId: 'carol' }));
  await assertFails(getDocs(collection(as('alice'), 'reports')));
  await assertFails(getDocs(collection(as('alice'), 'oaCache')));
});
