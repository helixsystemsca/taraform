import { Suspense } from "react";

import { LoginClient } from "@/app/(auth)/login/ui";

export default async function LoginPage(props: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await props.searchParams;
  const nextPath = sp.next || "/home";
  const authCallbackError = sp.error?.trim() || null;

  // `useSearchParams()` requires a suspense boundary during static prerendering.
  // We avoid it by passing `next` from the server-rendered page into a client component.
  return (
    <Suspense>
      <LoginClient nextPath={nextPath} authCallbackError={authCallbackError} />
    </Suspense>
  );
}

