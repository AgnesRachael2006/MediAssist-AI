"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  getDemoState,
  hydrateDemoState,
  subscribeDemoState,
} from "@/lib/store";
import type { DemoState } from "@/lib/types";

const empty = getDemoState();

export function useDemoStore(): DemoState {
  useEffect(() => {
    hydrateDemoState();
  }, []);

  return useSyncExternalStore(subscribeDemoState, getDemoState, () => empty);
}
