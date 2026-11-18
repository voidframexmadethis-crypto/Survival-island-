import Link from 'next/link';

export default function Custom500() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-950 text-stone-100">
      <h2 className="text-2xl font-bold mb-2">500 - Server-side error occurred</h2>
      <p className="text-stone-400 mb-4">Something went wrong on our servers.</p>
      <Link
        href="/"
        className="rounded bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-500 transition-colors"
      >
        Return Home
      </Link>
    </div>
  );
}
