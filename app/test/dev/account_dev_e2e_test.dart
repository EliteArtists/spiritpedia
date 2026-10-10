// DEV-ONLY end-to-end check of the real SupabaseAccountService against the
// spiritpedia-dev project and a local `next dev` (for the API routes).
// Skipped unless run deliberately:
//
//   flutter test test/dev --dart-define-from-file=config/dev.json \
//     --dart-define=DEV_E2E_EMAIL=… --dart-define=DEV_E2E_CODE=…
//
// The code comes from the Admin API (dev only) — the dev project's email
// template carries no code. Refuses to run against anything but dev.

import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/features/account/account_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const _email = String.fromEnvironment('DEV_E2E_EMAIL');
const _code = String.fromEnvironment('DEV_E2E_CODE');
const _url = String.fromEnvironment('SUPABASE_URL');
const _anon = String.fromEnvironment('SUPABASE_ANON_KEY');
const _api = String.fromEnvironment('API_BASE_URL');

void main() {
  final enabled = _email.isNotEmpty && _code.isNotEmpty;

  test('sign in, profile, saved items, delete — against dev', () async {
    expect(Uri.parse(_url).host, 'khtpbnofcavoerorajni.supabase.co', reason: 'dev only');
    final db = SupabaseClient(_url, _anon, authOptions: const AuthClientOptions(autoRefreshToken: false));
    final service = SupabaseAccountService(db, apiBaseUrl: _api);

    await service.verifyCode(_email, _code);
    final user = service.currentUser!;
    expect(user.email, cleanEmail(_email));

    expect(await service.ensureProfile(user.id), isTrue, reason: 'new account → created');
    expect(await service.ensureProfile(user.id), isFalse, reason: 'second call → left alone');
    expect((await service.profile(user.id))?.userType, 'explorer');

    await service.addFavourites(user.id, [
      (contentType: 'book', slug: 'brain-states'),
      (contentType: 'book_read', slug: 'brain-states'),
      (contentType: 'healer', slug: 'eckhart-tolle'),
    ]);
    await service.addFavourites(user.id, [(contentType: 'book', slug: 'brain-states')]); // duplicate: ignored
    expect((await service.favourites(user.id)).toSet(), {
      (contentType: 'book', slug: 'brain-states'),
      (contentType: 'book_read', slug: 'brain-states'),
      (contentType: 'healer', slug: 'eckhart-tolle'),
    });
    await service.removeFavourite(user.id, (contentType: 'healer', slug: 'eckhart-tolle'));
    expect(await service.favourites(user.id), hasLength(2));

    await service.sendWelcome(); // local next dev has no email key: nothing is sent
    await service.deleteAccount();

    // The old session can no longer read anything of the account.
    expect(await service.favourites(user.id), isEmpty);
    await db.dispose();
  }, skip: enabled ? false : 'dev-only: pass DEV_E2E_EMAIL and DEV_E2E_CODE');
}
