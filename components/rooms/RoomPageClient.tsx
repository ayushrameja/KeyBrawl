"use client";

import { useSearchParams } from "next/navigation";
import { RoomRace } from "@/components/rooms/RoomRace";
import type { Id } from "@/convex/_generated/dataModel";

export function RoomPageClient() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get("id");

  if (!roomId) {
    return (
      <main className="flex min-h-[calc(100vh-52px)] flex-col items-center justify-center gap-4 p-6">
        <p className="text-zinc-600 dark:text-zinc-400">
          Create or join a room from the Rooms page.
        </p>
        <a
          href="/rooms"
          className="text-cyan-600 hover:underline dark:text-cyan-400"
        >
          Go to Rooms
        </a>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-52px)] py-6">
      <RoomRace roomId={roomId as Id<"rooms">} />
    </main>
  );
}
