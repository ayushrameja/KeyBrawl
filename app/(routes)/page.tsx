import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-[calc(100vh-52px)] flex-col items-center justify-center gap-8 p-6">
      <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
        KeyBrawl
      </h1>
      <p className="max-w-md text-center text-zinc-600 dark:text-zinc-400">
        Enter KeyBrawl to practice typing or race others in real time.
      </p>
      <div className="flex gap-4">
        <Link
          href="/practice"
          className="rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Practice
        </Link>
        <Link
          href="/rooms"
          className="rounded-lg border border-zinc-300 px-6 py-3 font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Rooms
        </Link>
      </div>
    </main>
  );
}
