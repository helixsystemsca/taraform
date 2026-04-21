import { NextResponse } from "next/server";
import { z } from "zod";

import { effectiveAccountType, syncSupporterRoleInDb } from "@/lib/auth/accountType";
import { selectProfileRow } from "@/lib/auth/profileRow";
import { getCurrentUser, getServerSupabase } from "@/lib/auth/serverAuth";
import { isSupabaseSchemaMissingError } from "@/lib/supabase/migrationErrors";

const UpdateSchema = z.object({
  notifications_enabled: z.boolean(),
});

async function getUserOr401() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const supabase = await getServerSupabase();
  return { supabase, user } as const;
}

export async function GET() {
  const auth = await getUserOr401();
  if ("error" in auth) return auth.error;

  // Ensure a profile exists even if the database trigger wasn't installed yet.
  await auth.supabase
    .from("profiles")
    .upsert({ id: auth.user.id, email: auth.user.email }, { onConflict: "id" });

  const { data, error } = await selectProfileRow(auth.supabase, auth.user.id);

  if (error) {
    if (isSupabaseSchemaMissingError(error.message)) {
      return NextResponse.json({
        profile: null,
        setupError:
          "Supabase is not fully migrated. In the SQL editor, run `supabase/sql/auth_settings_audio.sql` (profiles, user_audio, storage policies, and the `audio` bucket).",
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const synced = await syncSupporterRoleInDb(auth.supabase, auth.user.id, auth.user.email, data);
  const role = effectiveAccountType(synced ?? data, auth.user.email, auth.user.authAccountType);
  const profile = data
    ? {
        ...data,
        account_type: role,
      }
    : null;

  return NextResponse.json({ profile });
}

export async function POST(req: Request) {
  const auth = await getUserOr401();
  if ("error" in auth) return auth.error;

  const json = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const { error } = await auth.supabase
    .from("profiles")
    .update({ notifications_enabled: parsed.data.notifications_enabled })
    .eq("id", auth.user.id);

  if (error) {
    if (isSupabaseSchemaMissingError(error.message)) {
      return NextResponse.json(
        {
          error:
            "Supabase is not fully migrated. Run `supabase/sql/auth_settings_audio.sql` in the SQL editor, then try again.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

