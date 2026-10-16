import { createClient } from '@supabase/supabase-js';

export const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://ryynkvtvodiaaelkdyab.supabase.co';

export const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_YGHVzWjmJmUWdxCvcBmA1w_p3StHy_T';

export const supabase = createClient(supabaseUrl, supabaseKey);
