import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProgress } from "@/lib/learn.functions";
import { StrictnessDots, strictnessLabel } from "@/components/StrictnessDots";
import type { PassedConcept } from "@/lib/progress";
import type { Strictness } from "@/lib/strictness";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "Progress — Strop" },
      { name: "description", content: "See which concepts you've mastered, at what grading, and where you still struggle." },
      { property: "og:title", content: "Progress — Strop" },
      { property: "og:description", content: "See which concepts you've mastered, at what grading, and where you still struggle." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProgressPage,
});

const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n * 100)}%`);

function groupByTopic(passed: PassedConcept[]) {
  const out: [string, PassedConcept[]][] = [];
  for (const p of passed) {
    const row = out.find(([t]) => t === p.topic);
    if (row) row[1].push(p);
    else out.push([p.topic, [p]]);
  }
  return out;
}

function ProgressPage() {
  const fetchProgress = useServerFn(getProgress);
  const { data, isLoading, error } = useQuery({ queryKey: ["progress"], queryFn: () => fetchProgress() });

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-4xl font-semibold tracking-tight">Your progress</h1>
      <p className="mt-2 text-muted-foreground">What you own, at what grading, and where you still slip.</p>

      {error && <p className="mt-8 text-destructive">{(error as Error).message}</p>}
      {isLoading && <p className="mt-8 text-muted-foreground">Loading…</p>}

      {data && (
        <>
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label="Concepts mastered" value={String(data.mastered)} />
            <Stat label="Passed first try" value={pct(data.firstTryRate)} />
            <Stat
              label="Avg. attempts to pass"
              value={data.avgRevisions === null ? "—" : data.avgRevisions.toFixed(1)}
            />
            <Stat label="Day streak" value={String(data.streakDays)} />
          </div>

          <p className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span>Passed at:</span>
            {(["fair", "strict", "ruthless"] as Strictness[]).map((level) => (
              <span key={level} className="inline-flex items-center gap-2">
                <StrictnessDots level={level} />
                {strictnessLabel(level)}
                <span className="font-medium text-foreground">{data.passedByLevel[level]}</span>
              </span>
            ))}
            {data.passedByLevel.unknown > 0 && (
              <span className="inline-flex items-center gap-2">
                <StrictnessDots level={null} />
                Not recorded
                <span className="font-medium text-foreground">{data.passedByLevel.unknown}</span>
              </span>
            )}
          </p>

          <section className="mt-12">
            <h2 className="font-display text-2xl">By topic</h2>
            <div className="mt-4 divide-y divide-border rounded-md border border-border bg-card">
              {data.topics.map((t) => {
                const pool = Math.max(t.pool, t.mastered, 1);
                return (
                  <Link
                    key={t.topic}
                    to="/learn/$topic"
                    params={{ topic: t.topic }}
                    className="block p-4 transition-colors hover:bg-accent"
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="font-medium">{t.topic}</span>
                      <span className="text-sm text-muted-foreground">
                        {t.mastered}/{t.pool || "∞"} · {t.inProgress} in progress · first try {pct(t.firstTryRate)}
                      </span>
                    </div>
                    <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-muted">
                      <div className="bg-success" style={{ width: `${(t.mastered / pool) * 100}%` }} />
                      <div className="bg-primary/40" style={{ width: `${(t.inProgress / pool) * 100}%` }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-2xl">Passed, and how hard you were marked</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              One dot is Fair, two Strict, three Ruthless — the grading a pass was earned under.
            </p>
            {data.passed.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Nothing passed yet. <Link to="/topics" className="text-primary underline">Pick a topic</Link>.
              </p>
            ) : (
              <div className="mt-4 space-y-6">
                {groupByTopic(data.passed).map(([topic, items]) => (
                  <div key={topic}>
                    <h3 className="text-sm font-medium">
                      {topic} <span className="text-muted-foreground">· {items.length} passed</span>
                    </h3>
                    <ul className="mt-2 divide-y divide-border rounded-md border border-border bg-card">
                      {items.map((p) => (
                        <li key={topic + p.name} className="flex items-center justify-between gap-4 p-3 text-sm">
                          <span>{p.name}</span>
                          <span className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {p.level ? strictnessLabel(p.level) : "not recorded"}
                            </span>
                            <StrictnessDots level={p.level} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="mt-12 grid gap-8 md:grid-cols-2">
            <section>
              <h2 className="font-display text-2xl">Still fighting you</h2>
              {data.struggling.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">Nothing has taken you more than one try yet.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {data.struggling.map((s) => (
                    <li key={s.topic + s.name} className="flex justify-between rounded-md border border-border bg-card p-3 text-sm">
                      <span>
                        {s.name} <span className="text-muted-foreground">· {s.topic}</span>
                      </span>
                      <span className="text-muted-foreground">{s.attempts} tries</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <h2 className="font-display text-2xl">Recent attempts</h2>
              {data.recent.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  No attempts yet. <Link to="/topics" className="text-primary underline">Pick a topic</Link>.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {data.recent.map((r, i) => (
                    <li key={i} className="flex justify-between rounded-md border border-border bg-card p-3 text-sm">
                      <span>
                        {r.name} <span className="text-muted-foreground">· {r.topic}</span>
                      </span>
                      <span className={r.passed ? "font-medium text-success" : "text-muted-foreground"}>
                        {r.passed ? "Passed" : "Revise"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-5">
      <p className="font-display text-3xl">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
