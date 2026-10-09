// Build-time configuration, passed with --dart-define-from-file:
//
//   flutter run --dart-define-from-file=config/prod.json
//
// Only PUBLIC values belong here. The Supabase anon key is public by design —
// the website ships the same key in every page — and RLS is what protects the
// data. The service-role key must never be in the app, in any form.
//
// config/prod.json   → the live Supabase project and https://www.spiritpedia.co
// config/dev.json    → the dev Supabase project and a local `next dev` (Phase 2;
//                      copy config/dev.example.json). Not committed.
class AppConfig {
  const AppConfig._();

  static const String env = String.fromEnvironment('APP_ENV');
  static const String supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
  );

  /// Where the Next.js API routes live. Every write goes through these.
  static const String apiBaseUrl = String.fromEnvironment('API_BASE_URL');

  static bool get isProduction => env == 'prod';

  /// Names of required values that were not supplied, so a build without its
  /// config file fails with a clear message instead of a null-pointer crash.
  static List<String> get missing => [
    if (env.isEmpty) 'APP_ENV',
    if (supabaseUrl.isEmpty) 'SUPABASE_URL',
    if (supabaseAnonKey.isEmpty) 'SUPABASE_ANON_KEY',
    if (apiBaseUrl.isEmpty) 'API_BASE_URL',
  ];
}
