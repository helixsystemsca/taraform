import { redirect } from "next/navigation";

/** Fallback if middleware did not run: Supabase sometimes redirects to `/?code=…` (Site URL root). */
export default async function Home(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await props.searchParams;
  const code = typeof sp.code === "string" ? sp.code : Array.isArray(sp.code) ? sp.code[0] : undefined;
  if (code) {
    const q = new URLSearchParams();
    q.set("code", code);
    const next = typeof sp.next === "string" ? sp.next : Array.isArray(sp.next) ? sp.next[0] : undefined;
    if (next) q.set("next", next);
    const err = typeof sp.error === "string" ? sp.error : Array.isArray(sp.error) ? sp.error[0] : undefined;
    if (err) q.set("error", err);
    const ed = typeof sp.error_description === "string" ? sp.error_description : undefined;
    if (ed) q.set("error_description", ed);
    redirect(`/auth/callback?${q.toString()}`);
  }
  redirect("/workspace");
}
