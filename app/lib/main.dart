import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:material_ui/material_ui.dart';

import 'screens/auth_screen.dart';
import 'screens/chat_list_screen.dart';
import 'theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Reads android/app/google-services.json and ios/Runner/GoogleService-Info.plist.
  await Firebase.initializeApp();
  runApp(const LinkquisyApp());
}

class LinkquisyApp extends StatelessWidget {
  const LinkquisyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Linkquisy',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      home: StreamBuilder<User?>(
        stream: FirebaseAuth.instance.userChanges(),
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Scaffold(body: Center(child: CircularProgressIndicator()));
          }
          return snap.data == null ? const AuthScreen() : const ChatListScreen();
        },
      ),
    );
  }
}
