import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// TODO: REMPLACE PAR TES CLÉS SUPABASE (Settings > API)
const supabaseUrl = 'https://TON_PROJET.supabase.co';
const supabaseKey = 'TA_CLE_ANON';

export const supabase = createClient(supabaseUrl, supabaseKey);
