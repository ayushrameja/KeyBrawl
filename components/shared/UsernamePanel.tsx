"use client";

import { useState, useCallback, useEffect } from "react";
import { getUsername, setUsername } from "@/lib/identity";

interface UsernamePanelProps {
  onUpdate?: (username: string) => void;
  className?: string;
}

export function UsernamePanel({ onUpdate, className = "" }: UsernamePanelProps) {
  const [username, setLocal] = useState("");
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");

  useEffect(() => {
    setLocal(getUsername());
  }, []);

  const save = useCallback(() => {
    const trimmed = input.trim().slice(0, 32);
    if (trimmed) {
      setUsername(trimmed);
      setLocal(trimmed);
      onUpdate?.(trimmed);
    }
    setEditing(false);
  }, [input, onUpdate]);

  const openEdit = useCallback(() => {
    setInput(username);
    setEditing(true);
  }, [username]);

  return (
    <div className={`rounded-lg border border-zinc-300 bg-zinc-100 p-3 dark:border-zinc-600 dark:bg-zinc-800/50 ${className}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">You</p>
      {editing ? (
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className="flex-1 rounded border border-zinc-400 bg-white px-2 py-1 text-sm dark:border-zinc-500 dark:bg-zinc-900 dark:text-zinc-100"
            autoFocus
            maxLength={32}
          />
          <button
            type="button"
            onClick={save}
            className="rounded bg-cyan-600 px-2 py-1 text-sm font-medium text-white hover:bg-cyan-700 dark:bg-cyan-500 dark:text-zinc-900"
          >
            Save
          </button>
        </div>
      ) : (
        <p className="mt-1 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {username}
          <button
            type="button"
            onClick={openEdit}
            className="ml-2 text-cyan-600 hover:underline dark:text-cyan-400"
          >
            Edit
          </button>
        </p>
      )}
    </div>
  );
}
