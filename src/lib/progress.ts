import { isStrictness, type Strictness } from "./strictness";

export type ConceptStat = { id: string; topic: string; name: string; status: string; attempts: number };
export type AttemptStat = {
  concept_id: string;
  passed: boolean;
  created_at: string;
  strictness: string | null;
};

export type TopicProgress = {
  topic: string;
  mastered: number;
  inProgress: number;
  pool: number;
  firstTryRate: number | null;
};

export type PassedConcept = { topic: string; name: string; level: Strictness | null; at: string };

export type PassedLevels = { fair: number; strict: number; ruthless: number; unknown: number };

export type ProgressSummary = {
  mastered: number;
  inProgress: number;
  totalAttempts: number;
  firstTryRate: number | null;
  avgRevisions: number | null;
  streakDays: number;
  topics: TopicProgress[];
  struggling: { topic: string; name: string; attempts: number }[];
  recent: { topic: string; name: string; passed: boolean; at: string }[];
  passed: PassedConcept[];
  passedByLevel: PassedLevels;
};

const day = (iso: string) => iso.slice(0, 10);

/** Consecutive days (ending today or yesterday) with at least one attempt. */
export function streak(dates: string[], today: Date): number {
  const days = new Set(dates.map(day));
  const cur = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (!days.has(cur.toISOString().slice(0, 10))) cur.setUTCDate(cur.getUTCDate() - 1);
  let n = 0;
  while (days.has(cur.toISOString().slice(0, 10))) {
    n++;
    cur.setUTCDate(cur.getUTCDate() - 1);
  }
  return n;
}

/** The grading level in force when a concept was finally passed (null = recorded before levels existed). */
export function passLevelOf(attempts: AttemptStat[], conceptId: string): Strictness | null {
  const passes = attempts
    .filter((a) => a.concept_id === conceptId && a.passed)
    .sort((x, y) => x.created_at.localeCompare(y.created_at));
  const last = passes[passes.length - 1];
  return last && isStrictness(last.strictness) ? last.strictness : null;
}

export function summarize(
  concepts: ConceptStat[],
  attempts: AttemptStat[],
  starterCounts: Record<string, number>,
  topicNames: string[],
  today = new Date(),
): ProgressSummary {
  const byConcept = new Map<string, AttemptStat[]>();
  for (const a of [...attempts].sort((x, y) => x.created_at.localeCompare(y.created_at))) {
    const list = byConcept.get(a.concept_id) ?? [];
    list.push(a);
    byConcept.set(a.concept_id, list);
  }
  const passedC = concepts.filter((c) => c.status === "passed");
  const firstTry = (cs: ConceptStat[]) => {
    const tried = cs.filter((c) => (byConcept.get(c.id)?.length ?? 0) > 0);
    if (!tried.length) return null;
    return tried.filter((c) => byConcept.get(c.id)![0]!.passed).length / tried.length;
  };
  const revs = passedC.map((c) => byConcept.get(c.id)?.length ?? c.attempts).filter((n) => n > 0);
  const conceptById = new Map(concepts.map((c) => [c.id, c]));

  const passed: PassedConcept[] = passedC
    .map((c) => ({
      topic: c.topic,
      name: c.name,
      level: passLevelOf(attempts, c.id),
      at: byConcept.get(c.id)?.at(-1)?.created_at ?? "",
    }))
    .sort((a, b) => a.topic.localeCompare(b.topic) || a.name.localeCompare(b.name));

  return {
    mastered: passedC.length,
    inProgress: concepts.filter((c) => c.status !== "passed" && c.attempts > 0).length,
    totalAttempts: attempts.length,
    firstTryRate: firstTry(concepts),
    avgRevisions: revs.length ? revs.reduce((a, b) => a + b, 0) / revs.length : null,
    streakDays: streak(attempts.map((a) => a.created_at), today),
    topics: topicNames.map((topic) => {
      const cs = concepts.filter((c) => c.topic === topic);
      const mastered = cs.filter((c) => c.status === "passed").length;
      return {
        topic,
        mastered,
        inProgress: cs.filter((c) => c.status !== "passed" && c.attempts > 0).length,
        pool: Math.max(starterCounts[topic] ?? 0, cs.length),
        firstTryRate: firstTry(cs),
      };
    }),
    struggling: concepts
      .filter((c) => c.status !== "passed" && c.attempts >= 2)
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 6)
      .map((c) => ({ topic: c.topic, name: c.name, attempts: c.attempts })),
    recent: [...attempts]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 8)
      .flatMap((a) => {
        const c = conceptById.get(a.concept_id);
        return c ? [{ topic: c.topic, name: c.name, passed: a.passed, at: a.created_at }] : [];
      }),
    passed,
    passedByLevel: {
      fair: passed.filter((p) => p.level === "fair").length,
      strict: passed.filter((p) => p.level === "strict").length,
      ruthless: passed.filter((p) => p.level === "ruthless").length,
      unknown: passed.filter((p) => p.level === null).length,
    },
  };
}
