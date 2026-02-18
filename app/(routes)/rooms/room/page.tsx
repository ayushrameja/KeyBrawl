import { Suspense } from "react";
import { RoomPageClient } from "@/components/rooms/RoomPageClient";

export default function RoomPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[calc(100vh-52px)] items-center justify-center p-6">
          <p className="text-zinc-500">Loading…</p>
        </main>
      }
    >
      <RoomPageClient />
    </Suspense>
  );
}
