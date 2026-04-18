import { Suspense } from "react";

import { LoginClient } from "@/app/(auth)/login/ui";
import { DEFAULT_POST_LOGIN_PATH } from "@/lib/auth/authCallbackUrl";

export default async function LoginPage(props: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await props.searchParams;
  const nextPath = sp.next || DEFAULT_POST_LOGIN_PATH;
  const authCallbackError = sp.error?.trim() || null;

  // `useSearchParams()` requires a suspense boundary during static prerendering.
  // We avoid it by passing `next` from the server-rendered page into a client component.
  return (
    <Suspense>
      <LoginClient nextPath={nextPath} authCallbackError={authCallbackError} />
    </Suspense>
  );
}

