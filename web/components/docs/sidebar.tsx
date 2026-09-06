"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { docsNav } from "@/lib/docs-nav";
import { cn } from "@/lib/utils";

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <nav className="space-y-6">
      {docsNav.map((group, i) => (
        <div key={group.title ?? i}>
          {group.title ? (
            <div className="mb-2 text-xs font-medium text-muted-foreground">{group.title}</div>
          ) : null}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-sm border-l-2 py-1 pl-3 text-sm transition-colors",
                      active
                        ? "border-primary font-medium text-foreground"
                        : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                    )}
                  >
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
