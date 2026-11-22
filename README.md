# Linquisy

A messenger for Android (and later iOS) with a built-in **Librarian** bot. In any one-to-one chat or group,
when someone mentions a paper or book (a title, DOI, arXiv ID, PubMed/PMC ID or ISBN), the Librarian searches
**legal open-access sources** in the background and posts the PDF link right in the chat.

| | |
|---|---|
| App | Flutter (one codebase for Android and iOS), in [`app/`](app) |
| Backend | Firebase Auth, Cloud Firestore, Cloud Functions (Node 22), in [`functions/`](functions) |
| Bot sources | Unpaywall, OpenAlex, Europe PMC (incl. PubMed Central), arXiv, DOAJ, CORE, OAPEN, DOAB, Project Gutenberg |

## What works in this MVP

- Email sign-up / sign-in, password reset.
- One-to-one chats and groups (create, add members, leave), live updates, chat list sorted by latest message.
- The Librarian bot, with a per-chat setting:
  - **Auto** (default): answers DOIs, arXiv / PubMed / PMC IDs and ISBNs whenever they appear, plus titles in
    quotes or requests like *"pdf of Attention Is All You Need"* or *"Harrison principles of internal medicine pdf please"*.
  - **/find only**: answers only messages that start with `/find` (or `@librarian`).
  - **Off**.
- Bot results show as cards with **Open PDF**, **EPUB** (books) and **Source page** buttons.
- If a paper exists but has no legal free copy, the bot says so and suggests the library / author / interlibrary loan.

## How the Librarian stays legal

- It only queries the open-access APIs listed above, each through its official public API.
- Every link is checked against a blocklist of shadow libraries (Sci-Hub, LibGen, Z-Library, Anna's Archive and
  their mirrors, see [`functions/src/blocklist.js`](functions/src/blocklist.js)) and dropped if it matches,
  even if an upstream index returns one.
- It **links** to the copy on the publisher or repository site instead of re-hosting the file, so the licence
  stays with the source. This also keeps your storage costs at zero.
- Guessed titles that don't match anything closely stay silent, so the bot doesn't spam groups.

## Repository layout

```
app/                Flutter app (lib/screens, lib/services, lib/widgets, lib/models)
functions/          Cloud Function `librarianBot` + the lookup library
  src/detect.js     finds DOIs, IDs, ISBNs and titles in a message
  src/resolve.js    queries the sources in parallel, scores, merges, filters
  src/sources/      one file per open-access source
  cli.js            try the bot from your terminal, no Firebase needed
firestore.rules     who can read and write what
docs/               setup, Play Store and iOS guides, privacy policy template
```

## Try the bot right now (no Firebase needed)

```bash
cd functions && npm install
CONTACT_EMAIL=you@example.com node cli.js "anyone have the pdf of Attention Is All You Need?"
CONTACT_EMAIL=you@example.com node cli.js "10.1038/nature12373"
npm test
```

## Next steps

1. [docs/SETUP.md](docs/SETUP.md): create the Firebase project and run the app on your phone.
2. [docs/PLAY_STORE.md](docs/PLAY_STORE.md): signing, store listing, and publishing on Google Play.
3. [docs/IOS.md](docs/IOS.md): the App Store, later.

Ideas after the MVP: push notifications (Firebase Cloud Messaging), phone-number sign-in, read receipts,
photos and file sharing, message search, and an in-app PDF viewer.
