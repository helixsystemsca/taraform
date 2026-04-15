"use client";

import * as React from "react";

import { useStudyStore } from "@/stores/useStudyStore";

export function StoreHydration() {
  React.useEffect(() => {
    void useStudyStore.persist.rehydrate();
  }, []);
  return null;
}
