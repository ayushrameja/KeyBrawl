"use client";

import { useMemo, useRef, useEffect } from "react";
import type { ReadingMode } from "@/lib/typing";

interface PassageDisplayProps {
  text: string;
  currentIndex: number;
  charResults: boolean[];
  typedText?: string;
  readingMode: ReadingMode;
  size?: "normal" | "large";
  variant?: "panel" | "plain";
}

export function PassageDisplay({
  text,
  currentIndex,
  charResults,
  typedText = "",
  readingMode,
  size = "normal",
  variant = "panel",
}: PassageDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const isFocusedMode = readingMode === "focusedScroll";

  const chars = useMemo(() => {
    function getStatus(i: number): "pending" | "correct" | "incorrect" | "current" {
      if (i < currentIndex) return charResults[i] ? "correct" : "incorrect";
      if (i === currentIndex) return "current";
      return "pending";
    }

    if (readingMode === "fullText") {
      return text.split("").map((char, i) => ({
        char,
        status: getStatus(i),
        globalIndex: i,
      }));
    }

    const words = text.split(" ");
    let charCount = 0;
    let currentWordIndex = 0;

    for (let i = 0; i < words.length; i++) {
      const wordEnd = charCount + words[i].length;
      if (currentIndex >= charCount && currentIndex <= wordEnd) {
        currentWordIndex = i;
        break;
      }
      charCount += words[i].length + 1;
    }

    if (currentIndex >= text.length) {
      currentWordIndex = Math.max(0, words.length - 1);
    }

    const startWordIndex = Math.max(0, currentWordIndex - 2);
    let startChar = 0;
    for (let i = 0; i < startWordIndex; i++) {
      startChar += words[i].length + 1;
    }

    const visibleWords = words.slice(startWordIndex, startWordIndex + 10);
    const visibleText = visibleWords.join(" ");

    return visibleText.split("").map((char, i) => ({
      char,
      status: getStatus(startChar + i),
      globalIndex: startChar + i,
    }));
  }, [text, currentIndex, charResults, readingMode]);

  useEffect(() => {
    if (readingMode !== "focusedScroll" || !containerRef.current || !cursorRef.current) return;
    cursorRef.current.scrollIntoView({ behavior: "auto", block: "nearest", inline: "center" });
  }, [currentIndex, readingMode]);

  const textSizeClass = size === "large"
    ? "text-3xl leading-[1.9] tracking-normal md:text-5xl md:leading-[1.8]"
    : "text-xl leading-relaxed tracking-wide md:text-2xl";

  const containerClass = variant === "plain"
    ? `relative min-h-[220px] p-1 ${isFocusedMode ? "overflow-x-auto overflow-y-hidden" : ""}`
    : `relative min-h-[120px] rounded-xl border border-zinc-700 bg-zinc-800/50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50 ${
        isFocusedMode ? "overflow-x-auto overflow-y-hidden" : ""
      }`;

  function formatChar(
    char: string,
    status: "pending" | "correct" | "incorrect" | "current",
    globalIndex: number
  ) {
    if (status !== "incorrect") {
      if (char === " " && isFocusedMode) return "\u00A0";
      return char;
    }

    const attemptedChar = typedText[globalIndex];
    if (!attemptedChar) return char;
    if (attemptedChar === " ") return "\u2423";
    return attemptedChar;
  }

  function describeChar(char: string) {
    if (char === " ") return "space";
    return char;
  }

  return (
    <div ref={containerRef} className={containerClass}>
      <div
        className={`${textSizeClass} text-zinc-300 ${
          isFocusedMode ? "whitespace-nowrap" : "whitespace-pre-wrap break-normal"
        }`}
      >
        {chars.map(({ char, status, globalIndex }) => (
          <span
            key={globalIndex}
            ref={status === "current" ? cursorRef : undefined}
            title={
              status === "incorrect"
                ? `You typed "${describeChar(typedText[globalIndex] ?? "")}", expected "${describeChar(char)}"`
                : undefined
            }
            className={
              status === "pending"
                ? "text-zinc-500"
                : status === "correct"
                  ? "text-cyan-400"
                  : status === "incorrect"
                    ? "rounded-sm bg-red-500/20 text-red-300"
                    : "relative text-zinc-100 before:pointer-events-none before:absolute before:-left-[2px] before:top-[0.08em] before:h-[1.1em] before:w-0.5 before:animate-pulse before:bg-cyan-400"
            }
          >
            {formatChar(char, status, globalIndex)}
          </span>
        ))}
      </div>
    </div>
  );
}
