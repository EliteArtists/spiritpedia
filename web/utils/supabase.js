import { createClient } from '@supabase/supabase-js';

// The PUBLIC DATA client. Anonymous, session-free, and shared by server
// components, client components and the sitemap alike.
//
// The auth options below are not a formality. This module is a singleton
// imported by server components, which run in a long-lived Node process shared
// by every visitor. A client that persisted a session here would hold it in
// module memory across requests — one visitor's identity answering another
// visitor's page. Declaring the client stateless makes that impossible rather
// than merely unlikely.
//
// Signed-in work belongs to utils/supabaseAuth.js, which creates a separate,
// browser-only client that does hold a session. Reads of RLS-protected tables
// (user_profiles) must go through that one; this client is always anonymous and
// will simply see nothing.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase URL or Key. Check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
