"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getPlayerId, getUsername } from "@/lib/identity";
import { generateText, wordCountForDurationSeconds } from "@/lib/typing";

const DURATIONS = [30, 60, 120, 180];
const MAX_PLAYERS_OPTIONS = [2, 3, 4, 5, 6, 7, 8];

export function CreateRoomForm() {
  const router = useRouter();
  const createRoom = useMutation(api.rooms.createRoom);
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [duration, setDuration] = useState(60);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmedName = name.trim().slice(0, 80);
    if (!trimmedName) {
      setError("Room name is required");
      return;
    }
    setLoading(true);
    try {
      const textSeed = `room-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const wordCount = wordCountForDurationSeconds(duration);
      const textToType = generateText(textSeed, wordCount);
      const result = await createRoom({
        name: trimmedName,
        isPublic,
        password: password.trim() || undefined,
        maxPlayers,
        duration,
        textToType,
        textSeed,
        createdBy: getPlayerId(),
        username: getUsername(),
      });
      router.push(`/rooms/room?id=${result.roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-zinc-300 bg-zinc-50 p-6 dark:border-zinc-600 dark:bg-zinc-800/50">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Create room</h2>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Room name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          className="mt-1 w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 dark:border-zinc-500 dark:bg-zinc-900 dark:text-zinc-100"
          placeholder="e.g. Quick race"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isPublic"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="isPublic" className="text-sm text-zinc-700 dark:text-zinc-300">Public (show in list)</label>
      </div>
      {!isPublic && (
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 dark:border-zinc-500 dark:bg-zinc-900 dark:text-zinc-100"
            placeholder="Optional"
          />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Max players (2–8)</label>
        <select
          value={maxPlayers}
          onChange={(e) => setMaxPlayers(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 dark:border-zinc-500 dark:bg-zinc-900 dark:text-zinc-100"
        >
          {MAX_PLAYERS_OPTIONS.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Duration (seconds)</label>
        <select
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 dark:border-zinc-500 dark:bg-zinc-900 dark:text-zinc-100"
        >
          {DURATIONS.map((d) => (
            <option key={d} value={d}>{d}s</option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-cyan-600 py-2.5 font-medium text-white hover:bg-cyan-700 disabled:opacity-50 dark:bg-cyan-500 dark:text-zinc-900 dark:hover:bg-cyan-400"
      >
        {loading ? "Creating…" : "Create room"}
      </button>
    </form>
  );
}
