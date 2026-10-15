export type ConceptStat = { id: string; topic: string; name: string; status: string; attempts: number };
export type AttemptStat = { concept_id: string; passed: boolean; created_at: string };

export type TopicProgress = {
  topic: string;
  mastered: number;
  inProgress: number;
  pool: number;
  firstTryRate: number | null;
};

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
  };
}
