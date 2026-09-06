import Link from "next/link";
import { DocsSidebar } from "@/components/docs/sidebar";
import { VersionBadge } from "@/components/docs/version-badge";
import { DocsBreadcrumbJsonLd } from "@/components/docs/breadcrumb-jsonld";

const REPO = "https://github.com/hasanraiyan/rcp";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DocsBreadcrumbJsonLd />
    <div className="flex flex-1 flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary" aria-hidden />
            <span className="text-[15px] font-semibold tracking-tight">RCP</span>
            <span className="ml-1 text-sm text-muted-foreground">docs</span>
            <VersionBadge />
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/docs/spec"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Spec
            </Link>
            <Link
              href="/docs/roadmap"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Roadmap
            </Link>
            <a
              href={REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              GitHub
            </a>
          </nav>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-10 px-6 py-10">
        <aside className="hidden w-52 shrink-0 md:block">
          <div className="sticky top-10">
            <DocsSidebar />
          </div>
        </aside>
        {children}
      </div>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 text-sm text-muted-foreground">
          <span>
            RCP v0.2.0 — in active design.{" "}
            <a
              href={`${REPO}/blob/master/LICENSE`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              MIT License
            </a>
            .
          </span>
          <span>
            Built by{" "}
            <a
              href="https://hasanraiyan.me"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:text-primary"
            >
              Raiyan Hasan
            </a>
          </span>
        </div>
      </footer>
    </div>
    </>
  );
}
