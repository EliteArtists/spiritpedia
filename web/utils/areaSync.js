// "Your area" in the account (user_preferences, migration 0019), as the app
// keeps it: at sign-in the account's area wins if it has one; otherwise this
// browser's is given to it. Owner-only by row-level security.
import { supabaseAuth } from './supabaseAuth.js';
import { readArea, tidyPlace, writeArea } from './area.js';

export async function saveAreaToAccount(userId, place) {
  if (!userId) return;
  await supabaseAuth
    .from('user_preferences')
    .upsert({ user_id: userId, area_place_id: place?.id ?? null });
}

export async function syncAreaWithAccount(userId) {
  if (!userId) return;
  const { data, error } = await supabaseAuth
    .from('user_preferences')
    .select('area_place_id, place:places(id, name, region, country, lat, lng)')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return;
  if (data) {
    writeArea(data.place ? tidyPlace(data.place) : null);
    return;
  }
  const local = readArea();
  if (local) await saveAreaToAccount(userId, local);
}
