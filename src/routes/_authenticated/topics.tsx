import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { addTopic, deleteTopic, listTopics } from "@/lib/learn.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StrictnessPicker } from "@/components/StrictnessPicker";


export const Route = createFileRoute("/_authenticated/topics")({
  head: () => ({
    meta: [
      { title: "Topics — Strop" },
      { name: "description", content: "Choose a topic to practise explaining concepts." },
      { property: "og:title", content: "Topics — Strop" },
      { property: "og:description", content: "Choose a topic to practise explaining concepts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TopicsPage,
});

function TopicsPage() {
  const list = useServerFn(listTopics);
  const add = useServerFn(addTopic);
  const del = useServerFn(deleteTopic);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["topics"], queryFn: () => list() });

  const onAdd = async (topicName: string) => {
    const trimmed = topicName.trim();
    if (!trimmed) return;
    try {
      await add({ data: { name: trimmed } });
      qc.invalidateQueries({ queryKey: ["topics"] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-4xl font-semibold tracking-tight">Pick a topic</h1>
      <p className="mt-2 text-muted-foreground">You'll get one concept at a time to explain.</p>

      {error && <p className="mt-8 text-destructive">{(error as Error).message}</p>}
      {isLoading && <p className="mt-8 text-muted-foreground">Loading…</p>}

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {data?.map((t) => (
          <div
            key={t.name}
            className="group relative rounded-md border border-border bg-card transition-colors hover:border-primary"
          >
            <Link to="/learn/$topic" params={{ topic: t.name }} className="block p-6">
              <p className="font-display text-2xl">{t.name}</p>
              <p className="mt-3 text-sm text-muted-foreground">
                <span className="font-medium text-success">{t.passed} passed</span>
                {" · "}
                <span>{t.rejected} to retry</span>
                {t.total > 0 && ` · ${t.total} starter concepts`}
                {t.custom && " · AI-generated"}
              </p>
            </Link>
            {t.custom && (
              <button
                aria-label={`Remove ${t.name}`}
                className="absolute right-3 top-3 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                onClick={async () => {
                  await del({ data: { name: t.name } });
                  qc.invalidateQueries({ queryKey: ["topics"] });
                }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}

        <AddTopicCard onAdd={onAdd} />
      </div>
    </main>
  );
}

function AddTopicCard({ onAdd }: { onAdd: (name: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const close = () => {
    setName("");
    setOpen(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await onAdd(name);
      close();
    } finally {
      setBusy(false);
    }
  };

  if (open) {
    return (
      <form
        onSubmit={submit}
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
        }}
        className="rounded-md border border-primary bg-card p-6"
      >
        <label htmlFor="new-topic" className="font-display text-2xl">
          Your own topic
        </label>
        <p className="mt-3 text-sm text-muted-foreground">Name any subject and the tutor builds the deck.</p>
        <div className="mt-4 flex gap-2">
          <Input
            id="new-topic"
            autoFocus
            placeholder="e.g. Kubernetes"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" disabled={busy || !name.trim()}>
            {busy ? "Adding…" : "Add"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="group flex flex-col rounded-md border border-border bg-card p-6 text-left transition-colors hover:border-primary"
    >
      <p className="font-display text-2xl">
        Bring your own topic
        <span aria-hidden className="ml-1 inline-block transition-transform group-hover:translate-x-1">
          →
        </span>
      </p>
      <p className="mt-3 text-sm text-muted-foreground">Name any subject and the tutor builds the deck.</p>
    </button>
  );
}
