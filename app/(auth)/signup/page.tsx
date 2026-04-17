import { Suspense } from "react";

import { SignupClient } from "@/app/(auth)/signup/ui";

export default async function SignupPage(props: { searchParams: Promise<{ next?: string }> }) {
  const sp = await props.searchParams;
  const nextPath = sp.next || "/home";
  return (
    <Suspense>
      <SignupClient nextPath={nextPath} />
    </Suspense>
  );
}

