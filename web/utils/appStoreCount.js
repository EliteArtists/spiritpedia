import { adminClient } from './supabaseAdmin.js';
import { cleanAppClick } from './appStores.js';

// SERVER ONLY. Counts one "Get the app" tap or close (migration 0052) for
// /get-app/<store> and /api/app-store-click. Anonymous: placement, store, kind
// of device and action, nothing about the visitor.
//
// It never throws and never holds the visitor up for long: before 0052 runs,
// without the service role, or if the database is slow, nothing is counted and
// the answer is false.
const WAIT_MS = 1500;

export async function countAppClick(values) {
  const click = cleanAppClick(values);
  if (!click) return false;
  const supabase = adminClient();
  if (!supabase) return false;
  try {
    const call = supabase.rpc('log_app_store_click', click).then(
      (r) => !r.error && r.data === true,
      () => false
    );
    const timeout = new Promise((resolve) => setTimeout(() => resolve(false), WAIT_MS));
    return await Promise.race([call, timeout]);
  } catch {
    return false;
  }
}
