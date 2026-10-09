import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// The Supabase client, initialised once in main.dart with the anon key.
///
/// READS ONLY. The anon key can read every content table and write almost
/// nothing (migration 0007). Every write goes through the Next.js API routes
/// (README → "For the Flutter build"). Do not loosen RLS to make a write work.
final supabaseProvider = Provider<SupabaseClient>((ref) => Supabase.instance.client);

/// Phase 0 connection check: how many subjects the live database holds (42 at
/// the time of writing). A read-only select — it proves the app can reach the
/// database with the public key, and nothing more. Replaced by real content in
/// Phase 1b.
final subjectCountProvider = FutureProvider<int>((ref) async {
  final rows = await ref.watch(supabaseProvider).from('subjects').select('id');
  return rows.length;
});
