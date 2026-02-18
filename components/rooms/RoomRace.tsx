"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getPlayerId, getUsername } from "@/lib/identity";
import { useTypingEngine } from "@/lib/typing";
import { formatTime } from "@/lib/typing";
import { PassageDisplay } from "@/components/practice/PassageDisplay";
import { UsernamePanel } from "@/components/shared/UsernamePanel";

interface RoomRaceProps {
  roomId: Id<"rooms">;
}

export function RoomRace({ roomId }: RoomRaceProps) {
  const room = useQuery(api.rooms.getRoom, { roomId });
  const startRace = useMutation(api.rooms.startRace);
  const setCountdown = useMutation(api.rooms.setCountdown);
  const setTimeLeft = useMutation(api.rooms.setTimeLeft);
  const updateProgress = useMutation(api.rooms.updatePlayerProgress);
  const leaveRoom = useMutation(api.rooms.leaveRoom);
  const updateUsername = useMutation(api.rooms.updateUsernameInRoom);
  const registerPresence = useMutation(api.presence.registerPresence);
  const keepAlive = useMutation(api.presence.keepAlive);
  const removePresence = useMutation(api.presence.removePresence);

  const playerId = getPlayerId();
  const {
    setText,
    startGame,
    typeChar,
    deleteChar,
    currentIndex,
    charResults,
    text,
    wpm,
    accuracy,
    mistakes,
  } = useTypingEngine();

  const raceStartedRef = useRef(false);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastProgressRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isHost = room?.createdBy === playerId;
  const roomRef = useRef(room);
  roomRef.current = room;

  useEffect(() => {
    if (!room) return;
    const status = room.status === "racing" || room.status === "countdown" ? "in_race" : "in_room";
    registerPresence({
      playerId,
      username: getUsername(),
      roomId,
      status,
    });
    return () => {
      removePresence({ playerId });
    };
  }, [roomId, playerId, room?.status, registerPresence, removePresence]);

  useEffect(() => {
    if (!room) return;
    const status = room.status === "racing" || room.status === "countdown" ? "in_race" : "in_room";
    const id = setInterval(() => {
      keepAlive({ playerId, status });
    }, 10_000);
    return () => clearInterval(id);
  }, [room?.status, playerId, keepAlive]);

  useEffect(() => {
    if (!room || room.status !== "racing" || raceStartedRef.current) return;
    raceStartedRef.current = true;
    setText(room.textToType);
    startGame();
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [room?.status, room?.textToType, setText, startGame]);

  useEffect(() => {
    if (room?.status === "countdown" && isHost && room.countdown > 0) {
      countdownIntervalRef.current = setInterval(() => {
        const r = roomRef.current;
        if (r?.status === "countdown" && r.countdown > 0) {
          setCountdown({ roomId, playerId, count: r.countdown - 1 });
        }
      }, 1000);
    }
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [room?.status, room?.countdown, isHost, roomId, playerId, setCountdown]);

  useEffect(() => {
    if (room?.status === "racing" && isHost && room.timeLeft > 0) {
      timerIntervalRef.current = setInterval(() => {
        const r = roomRef.current;
        if (r?.status === "racing" && r.timeLeft > 0) {
          setTimeLeft({ roomId, playerId, timeLeft: r.timeLeft - 1 });
        }
      }, 1000);
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [room?.status, room?.timeLeft, isHost, roomId, playerId, setTimeLeft]);

  const throttledUpdateProgress = useCallback(() => {
    if (!room || room.status !== "racing") return;
    const progress = text.length ? Math.round((currentIndex / text.length) * 100) : 0;
    if (progress === lastProgressRef.current && progress < 100) return;
    lastProgressRef.current = progress;
    updateProgress({
      roomId,
      playerId,
      progress,
      wpm,
      mistakes,
      finished: currentIndex >= text.length,
    });
  }, [room, roomId, playerId, currentIndex, text.length, wpm, mistakes, updateProgress]);

  useEffect(() => {
    const id = setInterval(throttledUpdateProgress, 500);
    return () => clearInterval(id);
  }, [throttledUpdateProgress]);

  useEffect(() => {
    if (room?.status === "racing" && room.timeLeft <= 0) {
      updateProgress({
        roomId,
        playerId,
        progress: text.length ? Math.round((currentIndex / text.length) * 100) : 0,
        wpm,
        mistakes,
        finished: true,
      });
    }
  }, [room?.status, room?.timeLeft, roomId, playerId, currentIndex, text.length, wpm, mistakes, updateProgress]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (room?.status !== "racing") return;
      if (e.key === "Backspace") {
        e.preventDefault();
        deleteChar();
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        typeChar(e.key);
      }
    },
    [room?.status, typeChar, deleteChar]
  );

  const handleLeave = useCallback(async () => {
    await removePresence({ playerId });
    await leaveRoom({ roomId, playerId });
    window.location.href = "/rooms";
  }, [roomId, playerId, leaveRoom, removePresence]);

  const handleStartRace = useCallback(async () => {
    await startRace({ roomId, playerId });
  }, [roomId, playerId, startRace]);

  const handleUsernameUpdate = useCallback(
    (newUsername: string) => {
      updateUsername({ roomId, playerId, username: newUsername });
    },
    [roomId, playerId, updateUsername]
  );

  if (room === undefined) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <p className="text-zinc-500">Loading room…</p>
      </div>
    );
  }

  if (room === null) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <p className="text-zinc-500">Room not found.</p>
        <a href="/rooms" className="ml-2 text-cyan-600 hover:underline dark:text-cyan-400">
          Back to rooms
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{room.name}</h1>
          <p className="text-sm text-zinc-500">Code: {room.roomCode}</p>
        </div>
        <div className="flex items-center gap-3">
          <UsernamePanel onUpdate={handleUsernameUpdate} />
          <button
            type="button"
            onClick={handleLeave}
            className="rounded-lg border border-zinc-400 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Leave
          </button>
        </div>
      </div>

      {room.status === "waiting" && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-500">
            {room.players.length} / {room.maxPlayers} players
          </p>
          <ul className="space-y-2 rounded-xl border border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-600 dark:bg-zinc-800/50">
            {room.players.map((p) => (
              <li key={p.playerId} className="flex items-center justify-between">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {p.username}
                  {p.playerId === room.createdBy && " (host)"}
                </span>
              </li>
            ))}
          </ul>
          {isHost && (
            <button
              type="button"
              onClick={handleStartRace}
              disabled={room.players.length < 2}
              className="rounded-lg bg-cyan-600 px-6 py-2.5 font-medium text-white hover:bg-cyan-700 disabled:opacity-50 dark:bg-cyan-500 dark:text-zinc-900"
            >
              Start race
            </button>
          )}
          {!isHost && <p className="text-sm text-zinc-500">Waiting for host to start.</p>}
        </div>
      )}

      {room.status === "countdown" && (
        <div className="flex h-48 items-center justify-center">
          <span className="text-8xl font-bold text-cyan-500 dark:text-cyan-400">
            {room.countdown || "Go"}
          </span>
        </div>
      )}

      {room.status === "racing" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">
              Time: {formatTime(room.timeLeft)}
            </p>
            <div className="rounded-lg border border-zinc-300 bg-zinc-100 px-4 py-2 dark:border-zinc-600 dark:bg-zinc-800">
              <p className="text-sm text-zinc-500">Your WPM</p>
              <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{wpm}</p>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-600 dark:bg-zinc-800/50">
            <p className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">Live standings</p>
            <ul className="space-y-1">
              {[...room.players]
                .sort((a, b) => b.wpm - a.wpm)
                .map((p) => (
                  <li
                    key={p.playerId}
                    className={`flex justify-between text-sm ${p.playerId === playerId ? "font-semibold text-cyan-600 dark:text-cyan-400" : "text-zinc-700 dark:text-zinc-300"}`}
                  >
                    <span>{p.username}</span>
                    <span>
                      {p.wpm} WPM · {p.progress}%
                      {p.finished && " ✓"}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
          <div className="relative">
            <PassageDisplay
              text={room.textToType}
              currentIndex={currentIndex}
              charResults={charResults}
              readingMode="focusedScroll"
            />
            <input
              ref={inputRef}
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label="Typing input"
              className="absolute inset-0 cursor-text opacity-0"
              onKeyDown={handleKeyDown}
              tabIndex={0}
            />
          </div>
        </div>
      )}

      {room.status === "finished" && (
        <div className="space-y-4 rounded-xl border border-zinc-300 bg-zinc-50 p-6 dark:border-zinc-600 dark:bg-zinc-800/50">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Results</h2>
          <ul className="space-y-2">
            {[...room.players]
              .sort((a, b) => b.wpm - a.wpm)
              .map((p, i) => (
                <li
                  key={p.playerId}
                  className={`flex justify-between rounded-lg border p-3 ${p.playerId === playerId ? "border-cyan-500 bg-cyan-500/10 dark:border-cyan-400 dark:bg-cyan-500/5" : "border-zinc-200 dark:border-zinc-600"}`}
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {i + 1}. {p.username}
                    {p.playerId === playerId && " (you)"}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {p.wpm} WPM · {p.progress}% · {p.mistakes} mistakes
                  </span>
                </li>
              ))}
          </ul>
          <button
            type="button"
            onClick={() => (window.location.href = "/rooms")}
            className="rounded-lg bg-cyan-600 px-6 py-2.5 font-medium text-white hover:bg-cyan-700 dark:bg-cyan-500 dark:text-zinc-900"
          >
            Back to rooms
          </button>
        </div>
      )}
    </div>
  );
}
