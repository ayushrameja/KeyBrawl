"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexProvider as BaseConvexProvider } from "convex/react";
import { useMemo } from "react";

const localConvexUrl = "http://127.0.0.1:3210";

export function ConvexProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => {
    const configuredUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!configuredUrl && process.env.NODE_ENV !== "production") {
      console.warn(
        "NEXT_PUBLIC_CONVEX_URL is not set. Falling back to local Convex deployment."
      );
    }
    return new ConvexReactClient(configuredUrl ?? localConvexUrl);
  }, []);

  return <BaseConvexProvider client={client}>{children}</BaseConvexProvider>;
}
