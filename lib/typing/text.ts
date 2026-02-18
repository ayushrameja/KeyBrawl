import { mulberry32, hashString } from "./seed";

const PUNCT_AFTER_WORD = [",", ".", "?", "!", ":", ";"];
export type TextDifficulty = "easy" | "medium" | "hard";

const WORDS = [
  "the", "a", "is", "it", "to", "in", "on", "at", "be", "as", "so", "we", "he",
  "by", "or", "do", "if", "my", "up", "an", "go", "no", "and", "for", "are",
  "but", "not", "you", "all", "can", "had", "her", "was", "one", "our", "out",
  "day", "get", "has", "him", "his", "how", "its", "let", "may", "new", "now",
  "old", "see", "two", "way", "who", "about", "after", "again", "back", "been",
  "being", "both", "came", "come", "could", "down", "each", "even", "find",
  "first", "from", "give", "good", "great", "hand", "have", "here", "high",
  "home", "just", "know", "last", "left", "life", "like", "line", "little",
  "long", "look", "made", "make", "many", "more", "most", "much", "must",
  "name", "need", "never", "next", "only", "other", "over", "part", "place",
  "point", "right", "same", "show", "small", "some", "sound", "still", "such",
  "take", "tell", "than", "that", "them", "then", "there", "these", "they",
  "thing", "think", "this", "three", "time", "turn", "under", "upon", "very",
  "want", "water", "well", "went", "were", "what", "when", "where", "which",
  "while", "will", "with", "word", "work", "world", "would", "write", "year",
  "your", "above", "across", "action", "actually", "against", "almost",
  "always", "another", "answer", "appear", "around", "become", "before",
  "behind", "believe", "below", "better", "between", "beyond", "brought",
  "called", "cannot", "carry", "center", "change", "children", "close",
  "common", "complete", "continue", "control", "country", "course", "cover",
  "create", "current", "different", "during", "early", "effect", "either",
  "enough", "entire", "example", "family", "father", "figure", "follow",
  "force", "form", "forward", "found", "friend", "front", "general", "given",
  "ground", "group", "happen", "having", "heard", "heart", "heavy", "house",
  "human", "hundred", "idea", "important", "include", "inside", "instead",
  "interest", "keep", "large", "later", "learn", "letter", "level", "light",
  "living", "moment", "money", "month", "mother", "move", "number", "often",
  "order", "person", "piece", "place", "plant", "play", "problem", "program",
  "public", "question", "quick", "quite", "rather", "really", "reason",
  "remember", "result", "room", "school", "second", "seem", "service",
  "several", "short", "since", "single", "society", "special", "start",
  "state", "story", "street", "strong", "system", "table", "today", "together",
  "toward", "true", "understand", "until", "usually", "voice", "watch", "whole",
];

const WORD_POOLS: Record<TextDifficulty, string[]> = {
  easy: WORDS.filter((word) => word.length <= 5),
  medium: WORDS,
  hard: WORDS.filter((word) => word.length >= 6),
};

const PUNCTUATION_RATE: Record<TextDifficulty, number> = {
  easy: 0.08,
  medium: 0.18,
  hard: 0.28,
};

export function generateText(
  seed: string,
  wordCount: number,
  options?: { difficulty?: TextDifficulty }
): string {
  const rand = mulberry32(hashString(seed));
  const difficulty = options?.difficulty ?? "medium";
  const pool = WORD_POOLS[difficulty].length ? WORD_POOLS[difficulty] : WORDS;
  const punctuationRate = PUNCTUATION_RATE[difficulty];
  const parts: string[] = [];

  for (let i = 0; i < wordCount; i++) {
    const word = pool[Math.floor(rand() * pool.length)];
    parts.push(word);

    if (i < wordCount - 1) {
      if (rand() < punctuationRate) {
        parts.push(PUNCT_AFTER_WORD[Math.floor(rand() * PUNCT_AFTER_WORD.length)]);
      }
      parts.push(" ");
    }
  }

  return parts.join("").trim();
}

export function wordCountForDurationSeconds(durationSeconds: number): number {
  const avgWPM = 55;
  const buffer = 1.8;
  return Math.ceil((durationSeconds / 60) * avgWPM * buffer);
}
