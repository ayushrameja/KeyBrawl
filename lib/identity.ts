const PLAYER_ID_KEY = "typing_app_player_id";
const USERNAME_KEY = "typing_app_username";

function genId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getPlayerId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = genId();
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

export function getUsername(): string {
  if (typeof window === "undefined") return "Player";
  const name = localStorage.getItem(USERNAME_KEY);
  return name ?? `Player${getPlayerId().slice(0, 6)}`;
}

export function setUsername(username: string): void {
  if (typeof window === "undefined") return;
  const trimmed = username.trim().slice(0, 32);
  localStorage.setItem(USERNAME_KEY, trimmed || getUsername());
}
