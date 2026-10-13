import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/AppHeader";
import { STARTER_TOPIC_NAMES } from "@/lib/concepts-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Strop — Learn tech concepts by explaining them" },
      {
        name: "description",
        content:
          "Pick a topic like ML, databases, AWS, system design or data engineering, explain a concept in your own words, and get graded pass or reject by an AI tutor.",
      },
      { property: "og:title", content: "Strop — Learn tech concepts by explaining them" },
      { property: "og:description", content: "Explain concepts in your own words and get graded by an AI tutor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const nextNumber = String(STARTER_TOPIC_NAMES.length + 1).padStart(2, "0");

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Logo />
        <Button asChild variant="ghost">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>
      <main className="mx-auto max-w-5xl px-6 pb-24 pt-16">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">The Feynman method, graded</p>
        <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
          If you can explain it, <em className="text-primary">you know it.</em>
        </h1>
        <p className="mt-8 max-w-xl text-lg text-muted-foreground">
          Pick a topic. Get a concept. Explain it in your own words. An AI tutor marks it passed or rejected and shows you
          what you missed. Passed concepts never come back; rejected ones return later.
        </p>
        <Button asChild size="lg" className="mt-10">
          <Link to="/topics">Start learning</Link>
        </Button>
        <div className="mt-24 grid gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-4">
          {STARTER_TOPIC_NAMES.map((t, i) => (
            <div key={t} className="flex flex-col bg-card p-6">
              <span className="font-display text-sm text-muted-foreground">0{i + 1}</span>
              <p className="mt-2 font-display text-xl">{t}</p>
            </div>
          ))}
          <Link
            to="/topics"
            className="group flex flex-col bg-card p-6 transition-colors hover:bg-accent"
          >
            <span className="font-display text-sm text-muted-foreground">{nextNumber}</span>
            <p className="mt-2 font-display text-xl text-primary">
              Bring your own topic
              <span aria-hidden className="ml-1 inline-block transition-transform group-hover:translate-x-1">
                →
              </span>
            </p>
            <p className="mt-auto pt-2 text-sm text-muted-foreground">Name any subject and the tutor builds the deck.</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
