"use client";

import { formatTime } from "@/lib/typing";

interface StatsDisplayProps {
  wpm: number;
  accuracy: number;
  timeLeft: number;
  mistakes: number;
}

export function StatsDisplay({
  wpm,
  accuracy,
  timeLeft,
  mistakes,
}: StatsDisplayProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-3 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
        <p className="text-xs uppercase tracking-wider text-zinc-500">WPM</p>
        <p className="text-xl font-bold text-cyan-400">{wpm}</p>
      </div>
      <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-3 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
        <p className="text-xs uppercase tracking-wider text-zinc-500">Accuracy</p>
        <p
          className={`text-xl font-bold ${
            accuracy >= 90
              ? "text-emerald-400"
              : accuracy >= 70
                ? "text-amber-400"
                : "text-red-400"
          }`}
        >
          {accuracy}%
        </p>
      </div>
      <div
        className={`rounded-xl border border-zinc-700 bg-zinc-800/50 p-3 text-center dark:border-zinc-700 dark:bg-zinc-900/50 ${timeLeft <= 10 ? "animate-pulse" : ""}`}
      >
        <p className="text-xs uppercase tracking-wider text-zinc-500">Time</p>
        <p className="text-xl font-bold text-blue-400">{formatTime(timeLeft)}</p>
      </div>
      <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-3 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
        <p className="text-xs uppercase tracking-wider text-zinc-500">Mistakes</p>
        <p className="text-xl font-bold text-red-400">{mistakes}</p>
      </div>
    </div>
  );
}
