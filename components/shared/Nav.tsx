"use client";

import Link from "next/link";

export function Nav() {
  return (
    <nav className="flex items-center gap-4 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <Link
        href="/"
        className="font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
      >
        Home
      </Link>
      <Link
        href="/practice"
        className="font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
      >
        Practice
      </Link>
      <Link
        href="/rooms"
        className="font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
      >
        Rooms
      </Link>
    </nav>
  );
}
