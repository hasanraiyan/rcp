export type ChecklistItem = {
  done: boolean;
  text: React.ReactNode;
};

export function Checklist({ items }: { items: ChecklistItem[] }) {
  return (
    <ul className="mt-4 space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-[15px] leading-6">
          <span
            aria-hidden
            className={
              "mt-1 flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border text-[9px] font-bold " +
              (item.done
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-transparent")
            }
          >
            {item.done ? "✓" : ""}
          </span>
          <span className={item.done ? "text-foreground" : "text-muted-foreground"}>
            {item.text}
          </span>
        </li>
      ))}
    </ul>
  );
}
