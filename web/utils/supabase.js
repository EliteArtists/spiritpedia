import { createClient } from '@supabase/supabase-js';

// Get the keys from the .env.local file you created
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Throw an error if the keys are missing (a good safety check)
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase URL or Key. Check your .env.local file.");
}

// Create the single Supabase client instance for your app
export const supabase = createClient(supabaseUrl, supabaseKey);