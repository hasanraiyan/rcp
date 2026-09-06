import { codeToHtml } from "shiki";
import { CopyButton } from "@/components/docs/copy-button";

const THEMES = { light: "github-light", dark: "github-dark-dimmed" } as const;

export async function CodeBlock({
  code,
  lang = "typescript",
  label,
}: {
  code: string;
  lang?: string;
  label?: string;
}) {
  const trimmed = code.trim();
  const html = await codeToHtml(trimmed, { lang, themes: THEMES, defaultColor: false });

  return (
    <div className="my-5 overflow-hidden rounded-md border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="font-mono text-xs text-muted-foreground">{label ?? lang}</span>
        <CopyButton code={trimmed} />
      </div>
      <div
        className="overflow-x-auto text-[13px] leading-6 [&_pre]:!bg-transparent [&_pre]:p-4"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

export function Callout({
  tone = "note",
  children,
}: {
  tone?: "note" | "warn";
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        "my-5 rounded-md border-l-2 bg-card px-4 py-3 text-[14px] leading-6 text-muted-foreground " +
        (tone === "warn" ? "border-l-destructive/60" : "border-l-primary")
      }
    >
      {children}
    </div>
  );
}
