# Publishing on Google Play

## What only you can do

| Step | Where | Cost |
|---|---|---|
| Google Play developer account (identity check takes 1–3 days) | https://play.google.com/console/signup | US$25 once |
| Firebase project on Blaze plan | https://console.firebase.google.com | Free tier, then usage-based |
| Upload key (keep it and its passwords safe forever) | your computer | free |
| Privacy policy hosted at a public URL | e.g. GitHub Pages or Google Sites | free |
| Store listing, content rating, data safety form | Play Console | free |

New personal developer accounts must run a **closed test with at least 12 testers for 14 days** before they can
publish to everyone. Start recruiting testers early.

## 1. Create your upload key (once)

```bash
keytool -genkey -v -keystore ~/inkwell-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

Create `app/android/key.properties` (git-ignored):

```
storePassword=<the password you chose>
keyPassword=<the password you chose>
keyAlias=upload
storeFile=/full/path/to/inkwell-upload.jks
```

Back up the `.jks` file and passwords somewhere safe. With Play App Signing (the default), Google holds the real
app signing key; if you lose this upload key you can ask Google to reset it, but it takes time.

## 2. Build the release bundle

1. Set the version in `app/pubspec.yaml`, e.g. `version: 1.0.0+1`. Increase the number after `+` for every upload.
2. Replace the launcher icon: put a 1024×1024 PNG in the app and use the `flutter_launcher_icons` package, or
   Android Studio > *New > Image Asset*.
3. Build:

```bash
cd app
flutter build appbundle --release
```

The file to upload is `app/build/app/outputs/bundle/release/app-release.aab`.

## 3. Play Console

1. **Create app**: name *Inkwell* (or your own name; check it isn't taken or trademarked), app, free.
2. **Testing > Closed testing**: create a track, upload the `.aab`, add testers' emails, roll out.
3. **App content**, fill in all of these:
   - *Privacy policy*: your public URL (template in [PRIVACY_POLICY.md](PRIVACY_POLICY.md)).
   - *App access*: give reviewers a test email and password so they can sign in.
   - *Ads*: no.
   - *Content rating* questionnaire: it is a communication app with user-generated content.
   - *Target audience*: 18+ (or 13+; under-13 brings extra rules).
   - *Data safety*: collected = name, email, messages (app functionality), user IDs; encrypted in transit; users
     can ask for deletion. Shared with no one for advertising.
   - *User-generated content*: Play requires apps with chat to let users **report and block** others and to have
     terms that ban abusive content. This MVP doesn't have report/block yet; add it before the production release
     (see below).
4. **Store listing**: short and full description, at least 2 phone screenshots, a 512×512 icon and a 1024×500
   feature graphic. Make your own artwork; don't use other messengers' logos or colours.
5. After the 14-day closed test, **Production > Create release**, upload, and submit for review.

## Before the production release

- Report and block users (Play UGC policy).
- Account deletion inside the app and on a web page (Play requires both for apps with accounts).
- Push notifications (Firebase Cloud Messaging) so people see new messages.
- Your own icon, name check, and a short terms of use.

I can build any of these next.

## CI build

`.github/workflows/ci.yml` runs the bot tests, `flutter analyze` and `flutter test` on every push. If you add a
repository secret named `GOOGLE_SERVICES_JSON` containing your whole `google-services.json`, it also builds an
installable APK you can download from the run's *Artifacts*.
