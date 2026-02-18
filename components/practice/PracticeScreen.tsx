"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import {
  useTypingEngine,
  generateText,
  wordCountForDurationSeconds,
  formatTime,
  type ReadingMode,
  type TextDifficulty,
} from "@/lib/typing";
import { PassageDisplay } from "./PassageDisplay";
import { SessionGraph, type SessionSample } from "./SessionGraph";

const DURATIONS = [30, 60, 120, 180];

const DIFFICULTIES: Array<{ value: TextDifficulty; label: string; note: string }> = [
  { value: "easy", label: "Easy", note: "Short words, lighter punctuation" },
  { value: "medium", label: "Medium", note: "Balanced length and punctuation" },
  { value: "hard", label: "Hard", note: "Longer words, heavier punctuation" },
];

export function PracticeScreen() {
  const {
    status,
    duration,
    timeLeft,
    text,
    currentIndex,
    charResults,
    typedText,
    wpm,
    accuracy,
    mistakes,
    setText,
    setDuration,
    startCountdown,
    startGame,
    typeChar,
    deleteChar,
    tick,
    endGame,
    reset,
  } = useTypingEngine();

  const [countdown, setCountdown] = useState(3);
  const [readingMode, setReadingMode] = useState<ReadingMode>("fullText");
  const [difficulty, setDifficulty] = useState<TextDifficulty>("medium");
  const [sessionSamples, setSessionSamples] = useState<SessionSample[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSampleSecondRef = useRef(-1);

  const elapsedSeconds = duration === 0 ? timeLeft : Math.max(0, duration - timeLeft);

  const buildPracticeText = useCallback(
    (nextDuration = duration, nextDifficulty = difficulty) => {
      const count = wordCountForDurationSeconds(nextDuration);
      const seed = `practice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setText(generateText(seed, count, { difficulty: nextDifficulty }));
    },
    [duration, difficulty, setText]
  );

  useEffect(() => {
    if (status === "idle" && !text) {
      buildPracticeText();
    }
  }, [status, text, buildPracticeText]);

  useEffect(() => {
    if (status === "countdown") {
      const id = setInterval(() => {
        setCountdown((c) => (c <= 1 ? 0 : c - 1));
      }, 1000);
      return () => clearInterval(id);
    }
  }, [status]);

  useEffect(() => {
    if (status === "countdown" && countdown === 0) {
      startGame();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [status, countdown, startGame]);

  const captureSample = useCallback(
    (force = false) => {
      const snapshot = useTypingEngine.getState();
      const second =
        snapshot.duration === 0
          ? snapshot.timeLeft
          : Math.max(0, snapshot.duration - snapshot.timeLeft);
      if (!force && second === lastSampleSecondRef.current) return;

      const nextSample: SessionSample = {
        second,
        wpm: snapshot.wpm,
        accuracy: snapshot.accuracy,
      };

      setSessionSamples((prev) => {
        if (!prev.length) return [nextSample];
        const last = prev[prev.length - 1];
        if (last.second === nextSample.second) {
          return [...prev.slice(0, -1), nextSample];
        }
        return [...prev, nextSample];
      });

      lastSampleSecondRef.current = second;
    },
    []
  );

  useEffect(() => {
    if (status === "playing") {
      const id = setInterval(() => {
        tick();
        captureSample();
      }, 1000);
      return () => clearInterval(id);
    }
  }, [status, tick, captureSample]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (status !== "playing") return;

      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        captureSample(true);
        endGame();
        return;
      }

      if (e.key === "Backspace") {
        e.preventDefault();
        deleteChar();
        captureSample(true);
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        typeChar(e.key);
        captureSample(true);
      }
    },
    [status, typeChar, deleteChar, captureSample, endGame]
  );

  const handleStart = useCallback(() => {
    if (status !== "idle") return;
    setCountdown(3);
    setSessionSamples([]);
    lastSampleSecondRef.current = -1;
    buildPracticeText();
    startCountdown();
  }, [status, buildPracticeText, startCountdown]);

  const handleRestart = useCallback(() => {
    reset();
    buildPracticeText();
    setSessionSamples([]);
    lastSampleSecondRef.current = -1;
  }, [reset, buildPracticeText]);

  if (status === "playing") {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-120px)] max-w-6xl items-center p-4">
        <div className="relative w-full">
          <PassageDisplay
            text={text}
            currentIndex={currentIndex}
            charResults={charResults}
            typedText={typedText}
            readingMode={readingMode}
            size="large"
            variant="plain"
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
            disabled={status !== "playing"}
            tabIndex={0}
          />
        </div>
      </div>
    );
  }

  if (status === "countdown") {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-120px)] max-w-4xl items-center justify-center p-4">
        <span className="text-8xl font-bold text-cyan-500 dark:text-cyan-400">
          {countdown || "Go"}
        </span>
      </div>
    );
  }

  if (status === "finished") {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-4">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-zinc-100">Session Complete</h1>
          <p className="mt-2 text-sm text-zinc-400">Nice chaos. Here is the damage report.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-zinc-500">WPM</p>
            <p className="text-2xl font-bold text-cyan-400">{wpm}</p>
          </div>
          <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Accuracy</p>
            <p className="text-2xl font-bold text-emerald-400">{accuracy}%</p>
          </div>
          <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Mistakes</p>
            <p className="text-2xl font-bold text-red-400">{mistakes}</p>
          </div>
          <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Time typed</p>
            <p className="text-2xl font-bold text-blue-400">{formatTime(elapsedSeconds)}</p>
          </div>
        </div>

        <SessionGraph samples={sessionSamples} />

        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleRestart}
            className="rounded-lg border border-zinc-500 px-6 py-2.5 font-medium text-zinc-200 hover:bg-zinc-900"
          >
            Start another run
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <div className="rounded-2xl border border-zinc-700 bg-zinc-900/60 p-6 md:p-8">
        <h1 className="text-3xl font-semibold text-zinc-100">Practice Setup</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Choose settings, then type in a distraction-free screen.
        </p>

        <div className="mt-8 space-y-7">
          <section className="space-y-3">
            <h2 className="text-sm uppercase tracking-wider text-zinc-500">Time</h2>
            <div className="flex flex-wrap gap-3">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    duration === d
                      ? "bg-cyan-500 text-zinc-900"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm uppercase tracking-wider text-zinc-500">Mode</h2>
            <div className="flex rounded-lg border border-zinc-700">
              <button
                type="button"
                onClick={() => setReadingMode("fullText")}
                className={`w-1/2 rounded-l-lg px-4 py-2 text-sm font-medium ${
                  readingMode === "fullText"
                    ? "bg-cyan-500 text-zinc-900"
                    : "bg-zinc-800 text-zinc-300"
                }`}
              >
                Full text
              </button>
              <button
                type="button"
                onClick={() => setReadingMode("focusedScroll")}
                className={`w-1/2 rounded-r-lg px-4 py-2 text-sm font-medium ${
                  readingMode === "focusedScroll"
                    ? "bg-cyan-500 text-zinc-900"
                    : "bg-zinc-800 text-zinc-300"
                }`}
              >
                Focus
              </button>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm uppercase tracking-wider text-zinc-500">Difficulty</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {DIFFICULTIES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setDifficulty(item.value)}
                  className={`rounded-xl border p-4 text-left transition ${
                    difficulty === item.value
                      ? "border-cyan-400 bg-cyan-500/10"
                      : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-500"
                  }`}
                >
                  <p className="font-medium text-zinc-100">{item.label}</p>
                  <p className="mt-1 text-xs text-zinc-400">{item.note}</p>
                </button>
              ))}
            </div>
          </section>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleStart}
              className="w-full rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-zinc-900 hover:bg-cyan-400"
            >
              Start practice
            </button>
            <p className="mt-3 text-center text-sm text-zinc-500">
              Finish early with Cmd+Enter (macOS) or Ctrl+Enter (Windows/Linux).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
