import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you are looking for does not exist.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-24 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 max-w-md text-[15px] leading-7 text-muted-foreground">
        The URL you inspected isn&apos;t indexed — it doesn&apos;t exist on this site. If you
        followed a link, it may have moved.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/"
          className="inline-flex h-9 items-center rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Go home
        </Link>
        <Link
          href="/docs"
          className="inline-flex h-9 items-center rounded-sm border border-border px-4 text-sm font-medium hover:bg-muted"
        >
          Browse docs
        </Link>
      </div>
    </div>
  );
}
