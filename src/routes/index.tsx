import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/AppHeader";
import { STARTER_TOPICS, STARTER_TOPIC_NAMES } from "@/lib/concepts-data";

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
      {
        property: "og:description",
        content: "Explain concepts in your own words and get graded by an AI tutor.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const STEPS = [
  {
    n: "01",
    title: "Pick a topic",
    body: "Machine learning, databases, AWS, system design — or name your own and the tutor builds the deck.",
  },
  {
    n: "02",
    title: "Explain in your own words",
    body: "One concept at a time. No multiple choice — you write it out, the way you would to a colleague.",
  },
  {
    n: "03",
    title: "Get graded, revise, pass",
    body: "A strict AI tutor points out exactly what is wrong or missing. You revise until it's right. Then it never asks again.",
  },
];

function Index() {
  const cards = [
    ...STARTER_TOPIC_NAMES.map((t) => ({
      name: t,
      count: STARTER_TOPICS[t].length,
      own: false,
    })),
    { name: "Bring your own topic", count: 0, own: true },
  ];
  const marqueeCards = [...cards, ...cards];

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Logo />
        <Button asChild variant="ghost">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-6 pb-20 pt-14 md:pt-20">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
            The Feynman method, graded
          </p>
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
            If you can explain it, <em className="text-primary">you know it.</em>
          </h1>
          <p className="mt-8 max-w-xl text-lg text-muted-foreground">
            Pick a topic. Get a concept. Explain it in your own words. An AI tutor marks it — pointing out exactly what
            you got wrong or missed — and doesn't let go until your explanation holds up.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Button asChild size="lg">
              <Link to="/topics">Start learning</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#how-it-works">How it works</a>
            </Button>
          </div>
          <p className="mt-8 text-sm text-muted-foreground">
            7 starter topics · Unlimited AI-generated concepts · Strict pass/reject grading
          </p>
        </section>

        {/* Topic marquee */}
        <section className="border-y border-border bg-card/50 py-14" aria-label="Topics">
          <div className="mx-auto mb-10 max-w-5xl px-6">
            <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Start from a topic<span className="text-primary">.</span>
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Every topic ships with a starter deck. Work through it, and the tutor keeps generating fresh concepts.
            </p>
          </div>
          <div className="strop-marquee-mask">
            <div className="strop-marquee-track">
              {marqueeCards.map((c, i) =>
                c.own ? (
                  <Link
                    to="/topics"
                    key={`${c.name}-${i}`}
                    aria-hidden={i >= cards.length}
                    tabIndex={i >= cards.length ? -1 : 0}
                    className="group mr-6 flex w-72 shrink-0 flex-col rounded-md border border-border bg-background p-6 transition-colors hover:bg-accent"
                  >
                    <span className="font-display text-sm text-muted-foreground">08</span>
                    <p className="mt-2 font-display text-2xl text-primary">
                      Bring your own topic
                      <span aria-hidden className="ml-1 inline-block transition-transform group-hover:translate-x-1">
                        →
                      </span>
                    </p>
                    <p className="mt-auto pt-2 text-sm text-muted-foreground">
                      Name any subject and the tutor builds the deck.
                    </p>
                  </Link>
                ) : (
                  <Link
                    to="/topics"
                    key={`${c.name}-${i}`}
                    aria-hidden={i >= cards.length}
                    tabIndex={i >= cards.length ? -1 : 0}
                    className="mr-6 flex w-72 shrink-0 flex-col rounded-md border border-border bg-background p-6 transition-colors hover:bg-accent"
                  >
                    <span className="font-display text-sm text-muted-foreground">
                      {String(cards.indexOf(c) + 1).padStart(2, "0")}
                    </span>
                    <p className="mt-2 font-display text-2xl">{c.name}</p>
                    <p className="mt-auto pt-2 text-sm text-muted-foreground">
                      {c.count} starter concepts
                    </p>
                  </Link>
                )
              )}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mx-auto max-w-5xl scroll-mt-20 px-6 py-24">
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Three steps<span className="text-primary">.</span> No shortcuts.
          </h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="flex flex-col bg-card p-8">
                <span className="font-display text-sm text-primary">{s.n}</span>
                <h3 className="mt-3 font-display text-xl">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-5xl px-6 pb-28">
          <div className="rounded-lg border border-border bg-card p-10 text-center md:p-16">
            <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Ready to find out what you <em className="text-primary">actually</em> know?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
              Sign in, pick a topic, and explain your first concept. The tutor is waiting — and it doesn't grade easy.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link to="/topics">Start learning</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 text-sm text-muted-foreground">
          <span>Strop.</span>
          <span>Explain it, or it doesn't count.</span>
        </div>
      </footer>
    </div>
  );
}
