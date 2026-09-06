"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function CopyButton({ code, className }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // clipboard unavailable — no-op
        }
      }}
      className={cn(
        "shrink-0 rounded-sm px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className
      )}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
