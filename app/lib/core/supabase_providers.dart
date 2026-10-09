import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// The Supabase client, initialised once in main.dart with the anon key.
///
/// READS ONLY. The anon key can read every content table and write almost
/// nothing (migration 0007). Every write goes through the Next.js API routes
/// (README → "For the Flutter build"). Do not loosen RLS to make a write work.
final supabaseProvider = Provider<SupabaseClient>(
  (ref) => Supabase.instance.client,
);
