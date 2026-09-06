import { DocsPrevNext } from "@/components/docs/prev-next";

export function DocPage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="min-w-0 flex-1 pb-24">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {description ? (
        <p className="mt-3 max-w-2xl text-[15px] leading-7 text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-8 max-w-2xl [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-8 [&_h3]:text-base [&_h3]:font-semibold [&_p]:mt-4 [&_p]:text-[15px] [&_p]:leading-7 [&_p]:text-muted-foreground [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:text-[15px] [&_ul]:leading-7 [&_ul]:text-muted-foreground [&_li_code]:text-foreground [&_strong]:font-semibold [&_strong]:text-foreground [&_code]:rounded-sm [&_code]:bg-secondary [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_code]:text-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_table]:mt-6 [&_table]:w-full [&_table]:border-collapse [&_table]:text-left [&_table]:text-sm [&_th]:border-b [&_th]:border-border [&_th]:py-2 [&_th]:pr-4 [&_th]:font-medium [&_th]:text-muted-foreground [&_td]:border-b [&_td]:border-border [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top [&_td]:text-foreground">
        {children}
      </div>
      <DocsPrevNext />
    </article>
  );
}
