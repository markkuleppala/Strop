import { STRICTNESS_LEVELS, type Strictness } from "@/lib/strictness";

/** How many dots represent one grading level: Fair 1, Strict 2, Ruthless 3. */
export const STRICTNESS_DOTS: Record<Strictness, number> = { fair: 1, strict: 2, ruthless: 3 };

export function strictnessLabel(level: Strictness): string {
  return STRICTNESS_LEVELS.find((l) => l.id === level)?.label ?? level;
}

/** One filled dot per step of the grading level, so a pass shows how hard it was earned. */
export function StrictnessDots({ level, className = "" }: { level: Strictness | null; className?: string }) {
  if (!level) {
    return <span className={`text-xs text-muted-foreground ${className}`}>—</span>;
  }
  const count = STRICTNESS_DOTS[level];
  return (
    <span
      className={`inline-flex items-center gap-1 align-middle ${className}`}
      title={`${strictnessLabel(level)} grading`}
      aria-label={`${strictnessLabel(level)} grading`}
    >
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="size-1.5 rounded-full bg-success" aria-hidden />
      ))}
    </span>
  );
}
