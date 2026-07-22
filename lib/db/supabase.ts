import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
  // Solo lanzar en runtime, no en build
  if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
    console.warn('⚠️ Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
}

/** Cliente con service role — solo para uso server-side (API routes) */
export const supabaseAdmin = createClient(supabaseUrl || 'http://localhost', serviceKey || 'placeholder', {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
