# iOS (later)

The Flutter code already runs on iOS; nothing in `lib/` is Android-only. What you'll need:

1. A Mac with Xcode (iOS builds can't be made on Windows or Linux, but a cloud Mac such as Codemagic works).
2. Apple Developer Program membership: US$99 per year, https://developer.apple.com/programs/
3. `flutterfire configure` with the `ios` platform, which writes `ios/Runner/GoogleService-Info.plist`.
4. In `app/ios/Podfile`, set `platform :ios, '15.0'` (Firebase's minimum), then `cd ios && pod install`.
5. In Xcode: set the bundle ID and your team under *Signing & Capabilities*.
6. `flutter build ipa`, then upload with Xcode or Transporter and test through TestFlight.
7. App Store review asks for the same things as Play: privacy policy, report/block for user content,
   in-app account deletion, and a demo login.
