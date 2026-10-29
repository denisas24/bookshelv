import { createClient } from '@supabase/supabase-js';

// Bookshelv-Projekt (Frankfurt). Der öffentliche Schlüssel kommt aus der
// Umgebungsvariable VITE_SUPABASE_ANON_KEY (in Vercel bzw. .env.local).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://tdjjddcjkhrekcctcaej.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY || 'missing-anon-key');
