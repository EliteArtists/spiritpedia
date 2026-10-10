import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// The Supabase client, initialised once in main.dart with the anon key.
///
/// Content is read with the anon key, which can write none of it (migration
/// 0007). Signed in, the same client writes the person's OWN profile and saved
/// items under the existing row-level security — exactly as the website does.
/// Anything needing more (account deletion, emails) goes through the Next.js
/// API routes. Do not loosen RLS to make a write work.
final supabaseProvider = Provider<SupabaseClient>(
  (ref) => Supabase.instance.client,
);
