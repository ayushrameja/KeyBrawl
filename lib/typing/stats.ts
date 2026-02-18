export function calculateWPM(correctChars: number, elapsedTimeMs: number): number {
  if (elapsedTimeMs <= 0) return 0;
  const elapsedMinutes = elapsedTimeMs / 60000;
  const words = correctChars / 5;
  return Math.round(words / elapsedMinutes);
}

export function calculateAccuracy(correctChars: number, totalTyped: number): number {
  if (totalTyped <= 0) return 100;
  return Math.round((correctChars / totalTyped) * 100);
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
