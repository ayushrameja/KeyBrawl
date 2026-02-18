"use client";

import { create } from "zustand";
import { calculateWPM, calculateAccuracy } from "./stats";

export type TypingStatus = "idle" | "countdown" | "playing" | "paused" | "finished";

export interface TypingEngineState {
  status: TypingStatus;
  duration: number;
  timeLeft: number;
  text: string;
  typedText: string;
  currentIndex: number;
  mistakes: number;
  correctChars: number;
  charResults: boolean[];
  wpm: number;
  accuracy: number;
  startTime: number | null;
  pausedTime: number;
  pauseStartTime: number | null;
}

export interface TypingEngineActions {
  setText: (text: string) => void;
  setDuration: (duration: number) => void;
  startCountdown: () => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  typeChar: (char: string) => void;
  deleteChar: () => void;
  tick: () => void;
  endGame: () => void;
  reset: () => void;
}

const initialState: TypingEngineState = {
  status: "idle",
  duration: 60,
  timeLeft: 60,
  text: "",
  typedText: "",
  currentIndex: 0,
  mistakes: 0,
  correctChars: 0,
  charResults: [],
  wpm: 0,
  accuracy: 100,
  startTime: null,
  pausedTime: 0,
  pauseStartTime: null,
};

export const useTypingEngine = create<TypingEngineState & TypingEngineActions>((set, get) => ({
  ...initialState,

  setText: (text) => set({ text }),
  setDuration: (duration) =>
    set({ duration, timeLeft: duration === 0 ? 0 : duration }),

  startCountdown: () => set({ status: "countdown" }),

  startGame: () => {
    const { duration } = get();
    set({
      status: "playing",
      startTime: Date.now(),
      pausedTime: 0,
      pauseStartTime: null,
      timeLeft: duration === 0 ? 0 : duration,
      typedText: "",
      currentIndex: 0,
      mistakes: 0,
      correctChars: 0,
      charResults: [],
      wpm: 0,
      accuracy: 100,
    });
  },

  pauseGame: () => {
    const state = get();
    if (state.status === "playing") {
      set({ status: "paused", pauseStartTime: Date.now() });
    }
  },

  resumeGame: () => {
    const state = get();
    if (state.status === "paused" && state.pauseStartTime) {
      const pauseDuration = Date.now() - state.pauseStartTime;
      set({
        status: "playing",
        startTime: state.startTime ? state.startTime + pauseDuration : Date.now(),
        pausedTime: state.pausedTime + pauseDuration,
        pauseStartTime: null,
      });
    }
  },

  typeChar: (char) => {
    const state = get();
    if (state.status !== "playing") return;

    const expectedChar = state.text[state.currentIndex];
    const isCorrect = char === expectedChar;

    const newIndex = state.currentIndex + 1;
    const newCharResults = [...state.charResults, isCorrect];
    const newCorrectChars = isCorrect ? state.correctChars + 1 : state.correctChars;
    const newMistakes = isCorrect ? state.mistakes : state.mistakes + 1;

    const newAccuracy = calculateAccuracy(newCorrectChars, newIndex);
    const elapsedMs = state.startTime ? Date.now() - state.startTime - state.pausedTime : 0;
    const newWpm = calculateWPM(newCorrectChars, elapsedMs);

    set({
      typedText: state.typedText + char,
      currentIndex: newIndex,
      charResults: newCharResults,
      correctChars: newCorrectChars,
      mistakes: newMistakes,
      wpm: newWpm,
      accuracy: newAccuracy,
    });

    if (newIndex >= state.text.length) {
      get().endGame();
    }
  },

  deleteChar: () => {
    const state = get();
    if (state.status !== "playing" || state.currentIndex === 0) return;

    const newIndex = state.currentIndex - 1;
    const wasCorrect = state.charResults[newIndex];
    const newCharResults = state.charResults.slice(0, -1);
    const newCorrectChars = wasCorrect ? state.correctChars - 1 : state.correctChars;

    const newAccuracy = calculateAccuracy(newCorrectChars, newIndex);
    const elapsedMs = state.startTime ? Date.now() - state.startTime - state.pausedTime : 0;
    const newWpm = calculateWPM(newCorrectChars, elapsedMs);

    set({
      typedText: state.typedText.slice(0, -1),
      currentIndex: newIndex,
      charResults: newCharResults,
      correctChars: newCorrectChars,
      wpm: newWpm,
      accuracy: newAccuracy,
    });
  },

  tick: () => {
    const state = get();
    if (state.status !== "playing") return;

    if (state.duration === 0) {
      set({ timeLeft: state.timeLeft + 1 });
    } else {
      const newTimeLeft = state.timeLeft - 1;
      if (newTimeLeft <= 0) {
        set({ timeLeft: 0 });
        get().endGame();
      } else {
        set({ timeLeft: newTimeLeft });
      }
    }
  },

  endGame: () => {
    set({ status: "finished" });
  },

  reset: () => {
    const { duration } = get();
    set({
      ...initialState,
      duration,
      timeLeft: duration === 0 ? 0 : duration,
      text: get().text,
    });
  },
}));
