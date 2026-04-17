import { NextResponse, type NextRequest } from "next/server";

import { supabaseRouteClient } from "@/app/api/auth/_shared";

export async function POST(req: NextRequest) {
  const { supabase, getResponse } = supabaseRouteClient(req);
  await supabase.auth.signOut();
  const res = getResponse();
  return NextResponse.json({ ok: true }, { headers: res.headers });
}

