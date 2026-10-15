import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getStrictness, setStrictness } from "@/lib/learn.functions";
import { DEFAULT_STRICTNESS, STRICTNESS_LEVELS, type Strictness } from "@/lib/strictness";
import { cn } from "@/lib/utils";

export function StrictnessPicker({
  label = "Grader strictness",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const get = useServerFn(getStrictness);
  const set = useServerFn(setStrictness);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["strictness"],
    queryFn: () => get(),
    placeholderData: { strictness: DEFAULT_STRICTNESS },
  });
  const current = data?.strictness ?? DEFAULT_STRICTNESS;

  const pick = async (level: Strictness) => {
    if (level === current) return;
    try {
      await set({ data: { strictness: level } });
      qc.setQueryData(["strictness"], { strictness: level });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="inline-flex rounded-md border border-border bg-card p-1"
      >
        {STRICTNESS_LEVELS.map((level) => {
          const active = level.id === current;
          return (
            <button
              key={level.id}
              type="button"
              role="radio"
              aria-checked={active}
              title={level.hint}
              onClick={() => pick(level.id)}
              className={cn(
                "rounded px-3 py-1 text-sm transition-colors",
                active
                  ? LEVEL_CLASS[level.id]
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {level.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const LEVEL_CLASS: Record<Strictness, string> = {
  fair: "bg-strict-fair text-strict-fair-foreground",
  strict: "bg-strict-strict text-strict-strict-foreground",
  ruthless: "bg-strict-ruthless text-strict-ruthless-foreground",
};
