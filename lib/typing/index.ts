export type ReadingMode = "fullText" | "focusedScroll";

export type TypingState = "idle" | "running" | "finished";

export { generateText, wordCountForDurationSeconds } from "./text";
export type { TextDifficulty } from "./text";
export { calculateWPM, calculateAccuracy, formatTime } from "./stats";
export { useTypingEngine } from "./engine";
export type { TypingEngineState, TypingEngineActions, TypingStatus } from "./engine";
export { mulberry32, hashString } from "./seed";
