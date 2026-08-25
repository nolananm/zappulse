import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://arwrmenzaxpgojaixsff.supabase.co';
const supabaseKey = 'sb_publishable_4A2BbpuR4KXu_S-xizg1OQ_KFKfnFD_';

export const supabase = createClient(supabaseUrl, supabaseKey);
