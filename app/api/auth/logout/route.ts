import type { NextRequest } from "next/server";

import { jsonWithSupabaseCookies, supabaseRouteClient } from "@/app/api/auth/_shared";

export async function POST(req: NextRequest) {
  const { supabase, getResponse } = supabaseRouteClient(req);
  await supabase.auth.signOut();
  return jsonWithSupabaseCookies(getResponse(), { ok: true });
}

