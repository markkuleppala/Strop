/** Chance that a previously rejected concept is brought back instead of a new one. */
export const RETRY_CHANCE = 0.3;

export type ConceptRow = {
  id: string;
  name: string;
  status: "new" | "passed" | "rejected" | string;
  last_attempt_at: string | null;
};

export type NextChoice =
  | { kind: "retry"; concept: ConceptRow }
  | { kind: "starter"; name: string }
  | { kind: "pending"; concept: ConceptRow }
  | { kind: "generate" };

/**
 * Decide which concept comes next.
 * - Passed concepts are never repeated.
 * - Rejected concepts come back later (oldest first), with RETRY_CHANCE when new ones exist.
 * - New concepts come from the starter list first, then the AI generates more.
 */
export function chooseNext(opts: {
  starterNames: string[];
  rows: ConceptRow[];
  rand: number;
  /** Concept just skipped — never served again immediately. */
  skipId?: string | null;
}): NextChoice {
  const seen = new Set(opts.rows.map((r) => r.name.toLowerCase()));
  const pool = opts.rows.filter((r) => r.id !== opts.skipId);
  const pending = pool.filter((r) => r.status === "new");
  const unseenStarters = opts.starterNames.filter((n) => !seen.has(n.toLowerCase()));
  const rejected = pool
    .filter((r) => r.status === "rejected")
    .sort((a, b) => (a.last_attempt_at ?? "").localeCompare(b.last_attempt_at ?? ""));

  if (rejected.length > 0 && opts.rand < RETRY_CHANCE) {
    return { kind: "retry", concept: rejected[0]! };
  }
  if (pending.length > 0) return { kind: "pending", concept: pending[0]! };
  if (unseenStarters.length > 0) {
    const idx = Math.floor(opts.rand * unseenStarters.length) % unseenStarters.length;
    return { kind: "starter", name: unseenStarters[idx]! };
  }
  return { kind: "generate" };
}
