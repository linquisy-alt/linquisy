# Setup: from this repo to the app on your phone

You need: a Google account, a computer (Windows, macOS or Linux), and an Android phone with USB debugging, or the
Android emulator. Roughly an hour the first time.

## 1. Install the tools

1. **Flutter**: https://docs.flutter.dev/get-started/install (choose Android). Run `flutter doctor` until it is happy.
2. **Android Studio** (comes with the Android SDK and emulator): https://developer.android.com/studio
3. **Node.js 22**: https://nodejs.org
4. **Firebase CLI**: `npm install -g firebase-tools`, then `firebase login`.
5. **FlutterFire CLI**: `dart pub global activate flutterfire_cli`.

## 2. Create the Firebase project

1. Go to https://console.firebase.google.com, **Add project**, name it (e.g. `linkquisy-app`). Analytics is optional.
2. **Upgrade to the Blaze (pay-as-you-go) plan.** Cloud Functions can only call outside APIs on Blaze. The free
   allowance (2M function calls, 50K Firestore reads per day) covers a small app; set a budget alert of a few
   dollars under *Usage and billing* so there are no surprises.
3. **Authentication** > Get started > enable **Email/Password**.
4. **Firestore Database** > Create database > production mode > pick a location near your users
   (e.g. `asia-south1` Mumbai). The location cannot be changed later.

## 3. Pick your package name

Your Play Store package name is permanent. The code uses `com.linkquisy.app`. Keep it if nobody else on Play has it, or choose your own (e.g. `com.yourname.linkquisy`) and replace
`com.linkquisy.app` in `app/android/app/build.gradle.kts` (`applicationId` and `namespace`) and move
`app/android/app/src/main/kotlin/com/linkquisy/app/MainActivity.kt` to match the new package path.
For iOS, set the same bundle ID in Xcode later.

## 4. Connect the app to Firebase

```bash
cd app
flutterfire configure --project=<your-firebase-project-id> --platforms=android,ios
```

This registers the Android and iOS apps and writes `android/app/google-services.json` and
`ios/Runner/GoogleService-Info.plist`. Both are git-ignored on purpose. (If `flutterfire` also writes
`lib/firebase_options.dart`, that is fine; the app reads the native files and doesn't need it.)

## 5. Deploy the backend

```bash
cd ..                                   # repo root
cp .firebaserc.example .firebaserc      # put your project id in it
cd functions && npm install && cd ..
```

Create `functions/.env` with:

```
CONTACT_EMAIL=you@example.com     # required: Unpaywall and OpenAlex ask for a real contact email
CORE_API_KEY=                      # optional: free key from https://core.ac.uk/services/api
OPENALEX_API_KEY=                  # optional: free key from https://openalex.org, raises rate limits
FUNCTION_REGION=asia-south1        # same region as your Firestore
```

Then:

```bash
firebase deploy --only firestore:rules,firestore:indexes,functions
```

The index can take a few minutes to build; until then the chat list shows an index error.

## 6. Run the app

Plug in your phone (or start an emulator) and run:

```bash
cd app
flutter run
```

Create two accounts (two phones, or sign out and in again), start a chat, and send
`pdf of Attention Is All You Need`. The Librarian should answer within a few seconds.

**If the bot doesn't answer:** Firebase console > Functions > `librarianBot` > Logs. The most common causes are the
project not being on Blaze, `CONTACT_EMAIL` missing, or the chat's bot mode being set to Off.

## Local testing without touching production

```bash
firebase emulators:start        # Auth, Firestore and Functions on your computer
```
