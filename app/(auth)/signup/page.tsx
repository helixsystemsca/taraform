import { Suspense } from "react";

import { SignupClient } from "@/app/(auth)/signup/ui";
import { DEFAULT_POST_LOGIN_PATH } from "@/lib/auth/authCallbackUrl";

export default async function SignupPage(props: { searchParams: Promise<{ next?: string }> }) {
  const sp = await props.searchParams;
  const nextPath = sp.next || DEFAULT_POST_LOGIN_PATH;
  return (
    <Suspense>
      <SignupClient nextPath={nextPath} />
    </Suspense>
  );
}

