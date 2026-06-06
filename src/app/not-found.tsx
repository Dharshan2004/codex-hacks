import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      <span className="text-5xl">🔍</span>
      <h1 className="mt-3 text-xl font-bold text-neutral-900">
        Room not found
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        This stream room or buyer link doesn&apos;t exist. It may have been
        created in a different environment.
      </p>
      <Link
        href="/"
        className="mt-5 rounded-lg bg-shopee px-4 py-2 text-sm font-semibold text-white hover:bg-shopee-dark"
      >
        Back to setup
      </Link>
    </main>
  );
}
