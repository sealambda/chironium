import { cn } from "@/shared/utils/utils";

interface TagColumnProps {
  label: string;
  tags: string[];
  tagClassName: string;
  emptyText: string;
  className?: string;
}

export function TagColumn({
  label,
  tags,
  tagClassName,
  emptyText,
  className,
}: Readonly<TagColumnProps>) {
  const keyCountByTag = new Map<string, number>();

  return (
    <div className={cn("space-y-3", className)}>
      <p className="font-bold text-foreground text-xl uppercase tracking-wide">{label}</p>
      {tags.length === 0 ? (
        <p className="text-foreground/40 text-sm italic">{emptyText}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => {
            const count = (keyCountByTag.get(tag) ?? 0) + 1;
            keyCountByTag.set(tag, count);
            return (
              <span
                key={`${tag}-${count}`}
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-sm",
                  tagClassName,
                )}
              >
                {tag}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
