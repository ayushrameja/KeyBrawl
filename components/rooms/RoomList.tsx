"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getPlayerId, getUsername } from "@/lib/identity";
import { CreateRoomForm } from "./CreateRoomForm";

export function RoomList() {
  const router = useRouter();
  const publicRooms = useQuery(api.rooms.listPublicRooms);
  const joinByCode = useMutation(api.rooms.joinRoomByCode);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  async function handleJoinByCode(e: React.FormEvent) {
    e.preventDefault();
    setJoinError("");
    if (!code.trim()) return;
    setJoining(true);
    try {
      const result = await joinByCode({
        roomCode: code.trim().toUpperCase(),
        playerId: getPlayerId(),
        username: getUsername(),
        password: password.trim() || undefined,
      });
      if (result.ok && result.roomId) {
        router.push(`/rooms/room?id=${result.roomId}`);
      } else {
        setJoinError(result.error ?? "Could not join");
      }
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Rooms</h1>
        <button
          type="button"
          onClick={() => setShowCreate((s) => !s)}
          className="rounded-lg bg-cyan-600 px-4 py-2 font-medium text-white hover:bg-cyan-700 dark:bg-cyan-500 dark:text-zinc-900"
        >
          {showCreate ? "Cancel" : "Create room"}
        </button>
      </div>

      {showCreate && <CreateRoomForm />}

      <div className="rounded-xl border border-zinc-300 bg-zinc-50 p-6 dark:border-zinc-600 dark:bg-zinc-800/50">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">Join by code</h2>
        <form onSubmit={handleJoinByCode} className="flex flex-wrap gap-3">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Room code"
            maxLength={6}
            className="rounded-lg border border-zinc-400 bg-white px-3 py-2 uppercase dark:border-zinc-500 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (if private)"
            className="rounded-lg border border-zinc-400 bg-white px-3 py-2 dark:border-zinc-500 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <button
            type="submit"
            disabled={joining || !code.trim()}
            className="rounded-lg bg-zinc-700 px-4 py-2 font-medium text-white hover:bg-zinc-600 disabled:opacity-50 dark:bg-zinc-600 dark:hover:bg-zinc-500"
          >
            {joining ? "Joining…" : "Join"}
          </button>
        </form>
        {joinError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{joinError}</p>}
      </div>

      <div className="rounded-xl border border-zinc-300 bg-zinc-50 p-6 dark:border-zinc-600 dark:bg-zinc-800/50">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">Public rooms</h2>
        {publicRooms === undefined ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : publicRooms.length === 0 ? (
          <p className="text-sm text-zinc-500">No public rooms right now. Create one above.</p>
        ) : (
          <ul className="space-y-2">
            {publicRooms.map((room) => (
              <li key={room._id}>
                <RoomListItem router={router} roomId={room._id} roomCode={room.roomCode} name={room.name} playerCount={room.playerCount} maxPlayers={room.maxPlayers} hasPassword={room.hasPassword} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function RoomListItem({
  router,
  roomId,
  roomCode,
  name,
  playerCount,
  maxPlayers,
  hasPassword,
}: {
  router: ReturnType<typeof useRouter>;
  roomId: Id<"rooms">;
  roomCode: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  hasPassword: boolean;
}) {
  const joinRoom = useMutation(api.rooms.joinRoom);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  async function handleJoin() {
    setError("");
    setJoining(true);
    try {
      const result = await joinRoom({
        roomId,
        playerId: getPlayerId(),
        username: getUsername(),
        password: hasPassword ? password : undefined,
      });
      if (result.ok) {
        router.push(`/rooms/room?id=${roomId}`);
      } else {
        setError(result.error ?? "Could not join");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-900">
      <div>
        <p className="font-medium text-zinc-900 dark:text-zinc-100">{name}</p>
        <p className="text-sm text-zinc-500">
          {roomCode} · {playerCount}/{maxPlayers} players {hasPassword && "· 🔒"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {hasPassword && (
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-24 rounded border border-zinc-400 px-2 py-1 text-sm dark:border-zinc-500 dark:bg-zinc-800 dark:text-zinc-100"
          />
        )}
        <button
          type="button"
          onClick={handleJoin}
          disabled={joining || (hasPassword && !password.trim())}
          className="rounded bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50 dark:bg-cyan-500 dark:text-zinc-900"
        >
          {joining ? "…" : "Join"}
        </button>
      </div>
      {error && <p className="w-full text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
