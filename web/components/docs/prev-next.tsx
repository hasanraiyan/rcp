"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { flatDocsNav } from "@/lib/docs-nav";

export function DocsPrevNext() {
  const pathname = usePathname();
  const index = flatDocsNav.findIndex((item) => item.href === pathname);
  if (index === -1) return null;

  const prev = index > 0 ? flatDocsNav[index - 1] : null;
  const next = index < flatDocsNav.length - 1 ? flatDocsNav[index + 1] : null;
  if (!prev && !next) return null;

  return (
    <div className="mt-16 flex items-center justify-between border-t border-border pt-6">
      {prev ? (
        <Link href={prev.href} className="group max-w-[45%]">
          <div className="text-xs text-muted-foreground">Previous</div>
          <div className="text-sm font-medium group-hover:text-primary">{prev.title}</div>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={next.href} className="group max-w-[45%] text-right">
          <div className="text-xs text-muted-foreground">Next</div>
          <div className="text-sm font-medium group-hover:text-primary">{next.title}</div>
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
