// Client-safe barrel (do not export server-only helpers here).
// Anything that touches `next/headers` or `server-only` must be imported from `@/lib/supabase/server` directly.
export { isSupabaseConfigured } from "@/lib/supabase/env";
export { supabaseBrowser } from "@/lib/supabase/browser";

