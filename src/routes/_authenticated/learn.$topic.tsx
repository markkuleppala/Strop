import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Check, Loader2, RotateCcw, X } from "lucide-react";
import { STRICTNESS_LEVELS } from "@/lib/strictness";
import { gradeExplanation, nextConcept, topicHistory } from "@/lib/learn.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StrictnessPicker } from "@/components/StrictnessPicker";
import { reviewAnswer, type AnswerIssue } from "@/lib/answer-review";


export const Route = createFileRoute("/_authenticated/learn/$topic")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.topic} — Strop` },
      { name: "description", content: `Explain ${params.topic} concepts and get graded.` },
      { property: "og:title", content: `${params.topic} — Strop` },
      { property: "og:description", content: `Explain ${params.topic} concepts and get graded.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LearnPage,
});

type Previous = { explanation: string; feedback: string };
type Concept = { id: string; name: string; retry: boolean; previous: Previous | null };
type Grade = { passed: boolean; feedback: string; model_answer: string; strictness: string; issues: AnswerIssue[] };
const levelLabel = (id: string) => STRICTNESS_LEVELS.find((l) => l.id === id)?.label ?? id;

function LearnPage() {
  const { topic } = Route.useParams();
  const getNext = useServerFn(nextConcept);
  const grade = useServerFn(gradeExplanation);
  const history = useServerFn(topicHistory);
  const qc = useQueryClient();

  const [concept, setConcept] = useState<Concept | null>(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState<Grade | null>(null);
  const [loading, setLoading] = useState<"next" | "grade" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const hist = useQuery({ queryKey: ["history", topic], queryFn: () => history({ data: { topic } }) });

  const loadNext = useCallback(async (skipId?: string) => {
    setLoading("next");
    setErr(null);
    setResult(null);
    setText("");
    setLastFeedback(null);
    setShowFeedback(false);
    try {
      const c = await getNext({ data: { topic, skipId: skipId ?? null } });
      setConcept(c);
      if (c.previous) {
        setText(c.previous.explanation);
        setLastFeedback(c.previous.feedback);
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(null);
    }
  }, [getNext, topic]);

  useEffect(() => {
    loadNext();
  }, [loadNext]);

  const submit = async () => {
    if (!concept) return;
    setLoading("grade");
    setErr(null);
    try {
      const r = await grade({ data: { conceptId: concept.id, explanation: text } });
      setResult(r);
      if (!r.passed) setLastFeedback(r.feedback);
      if (r.passed) {
        qc.invalidateQueries({ queryKey: ["history", topic] });
        qc.invalidateQueries({ queryKey: ["topics"] });
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const revise = () => {
    setResult(null);
    setShowFeedback(false);
  };

  const passed = hist.data?.filter((h) => h.status === "passed").length ?? 0;
  const rejected = hist.data?.filter((h) => h.status === "rejected").length ?? 0;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link to="/topics" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All topics
      </Link>
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-4">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">{topic}</p>
        <p className="text-sm text-muted-foreground">
          <span className="text-success">{passed} passed</span> · {rejected} to retry
        </p>
      </div>
      <StrictnessPicker label="Grading by" className="mt-4" />


      <section className="mt-6 rounded-md border border-border bg-card p-8">
        {loading === "next" ? (
          <p className="text-sm text-muted-foreground">Finding your next concept…</p>
        ) : concept ? (
          <>
            <p className="text-sm text-muted-foreground">
              {concept.retry ? (
                <span className="inline-flex items-center gap-1"><RotateCcw className="h-3 w-3" /> Second chance — explain:</span>
              ) : (
                "Explain in your own words:"
              )}
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">{concept.name}</h1>

            {!result ? (
              <>
                {lastFeedback && (
                  <div className="mt-6 text-sm">
                    <button
                      type="button"
                      className="text-primary underline-offset-4 hover:underline"
                      onClick={() => setShowFeedback((v) => !v)}
                    >
                      {showFeedback ? "Hide feedback" : "Show feedback on your last answer"}
                    </button>
                    {showFeedback && (
                      <p className="mt-2 rounded-md border border-border bg-background p-3 text-muted-foreground">{lastFeedback}</p>
                    )}
                  </div>
                )}
                <Textarea
                  autoFocus
                  className="mt-6 min-h-48 bg-background text-base"
                  placeholder="What is it, why does it matter, and how does it work?"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={loading === "grade"}
                />
                <div className="mt-4 flex justify-between gap-2">
                  <Button variant="ghost" onClick={loadNext} disabled={!!loading}>Skip</Button>
                  <Button onClick={submit} disabled={!!loading || text.trim().length < 10}>
                    {loading === "grade" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Grading…
                      </>
                    ) : (
                      "Submit explanation"
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="mt-6 space-y-6">
                <div
                  className={`flex items-center gap-2 rounded-md px-4 py-3 font-display text-xl ${
                    result.passed ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"
                  }`}
                >
                  {result.passed ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                  {result.passed ? "Passed" : "Not yet — revise your answer"}
                  <span className="ml-auto font-sans text-sm opacity-80">Graded {levelLabel(result.strictness)}</span>
                </div>
                {!result.passed && (
                  <div>
                    <h2 className="text-lg font-semibold">Your answer</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Underlined sentences are the ones the tutor flagged — the rest read as correct.
                    </p>
                    <AnswerReview text={text} issues={result.issues ?? []} />
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-semibold">
                    {result.passed ? "Feedback" : "What's wrong or missing"}
                  </h2>
                  <p className="mt-1 text-muted-foreground">{result.feedback}</p>
                </div>
                {result.passed ? (
                  <>
                    <div>
                      <h2 className="text-lg font-semibold">A good explanation</h2>
                      <div className="prose prose-sm mt-1 max-w-none text-foreground [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5">
                        <ReactMarkdown>{result.model_answer}</ReactMarkdown>
                      </div>
                    </div>
                    <Button onClick={loadNext}>Next concept</Button>
                  </>
                ) : (
                  <div className="flex justify-between gap-2">
                    <Button variant="ghost" onClick={() => loadNext(concept?.id)} disabled={!!loading}>Give up — next concept</Button>
                    <Button onClick={revise}>Revise my answer</Button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}
        {err && (
          <div className="mt-4 text-sm text-destructive">
            {err}{" "}
            {!concept && <button className="underline" onClick={loadNext}>Try again</button>}
          </div>
        )}
      </section>

      {hist.data && hist.data.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold">Your record</h2>
          <ul className="mt-4 divide-y divide-border rounded-md border border-border bg-card">
            {hist.data.map((h) => (
              <li key={h.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>{h.name}</span>
                <span className={h.status === "passed" ? "text-success" : "text-destructive"}>
                  {h.status === "passed" ? "Passed" : "Rejected"} · {h.attempts} {h.attempts === 1 ? "try" : "tries"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function AnswerReview({ text, issues }: { text: string; issues: AnswerIssue[] }) {
  const { segments, notes } = reviewAnswer(text, issues);
  return (
    <div className="mt-2 rounded-md border border-border bg-background p-4">
      <p className="whitespace-pre-wrap text-sm">
        {segments.map((s, i) =>
          s.problems.length ? (
            <span key={i} className="underline decoration-destructive decoration-wavy decoration-2 underline-offset-4">
              {s.text}
            </span>
          ) : (
            <span key={i}>{s.text}</span>
          ),
        )}
      </p>
      {notes.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-border pt-3 text-xs">
          {notes.map((n, i) => (
            <li key={i}>
              {n.quote && <span className="block text-muted-foreground">"{n.quote}"</span>}
              <span className="text-destructive">{n.problem}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
