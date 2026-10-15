import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/AppHeader";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
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


function AccountCluster() {
  const { session, ready } = useSession();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await router.invalidate();
    navigate({ to: "/auth", replace: true });
  };

  if (!ready) return <span className="h-9 w-40" aria-hidden />;

  if (!session) {
    return (
      <Button asChild variant="ghost" size="sm">
        <Link to="/auth">Sign in</Link>
      </Button>
    );
  }

  const email = session.user.email ?? "your account";

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">{email}</span>
      <Button asChild size="sm" variant="outline">
        <Link to="/topics">Continue learning</Link>
      </Button>
      <Button size="sm" variant="ghost" onClick={signOut}>
        Sign out
      </Button>
    </div>
  );
}

function Index() {
  const cards = [
    ...STARTER_TOPIC_NAMES.map((t) => ({
      name: t,
      count: STARTER_TOPICS[t]?.length ?? 0,
      own: false,
    })),
    { name: "Bring your own topic", count: 0, own: true },
  ];
  const marqueeCards = [...cards, ...cards];

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Logo />
        <AccountCluster />
      </header>

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-6 pb-16 pt-14 md:pb-20 md:pt-20">
          <h1 className="max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            "If you can't explain it <em className="text-primary">simply</em>, you don't understand it well enough."
          </h1>
          <p className="mt-4 font-display text-sm italic text-muted-foreground">— Albert Einstein</p>

          <p className="mt-5 max-w-xl text-base text-muted-foreground">
            Pick a topic. Get a concept. Explain it in your own words. An AI tutor marks it — pointing out exactly what
            you got wrong or missed — and doesn't let go until your explanation holds up.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link to="/topics">Start learning</Link>
            </Button>
          </div>

          <p className="mt-5 text-xs text-muted-foreground">
            7 starter topics · Unlimited AI-generated concepts · Strict pass/reject grading
          </p>
        </section>

        {/* Topic marquee */}
        <section
          className="flex flex-1 flex-col justify-center border-y border-border bg-card/50 py-14"
          aria-label="Topics"
        >
          <div className="mx-auto mb-8 max-w-5xl px-6">
            <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
              Start from a topic<span className="text-primary">.</span>
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
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
                    className="group mr-4 flex w-64 shrink-0 flex-col rounded-md border border-border bg-background p-5 transition-colors hover:bg-accent"
                  >
                    <span className="font-display text-xs text-muted-foreground">08</span>
                    <p className="mt-1 font-display text-xl text-primary">
                      Bring your own topic
                      <span aria-hidden className="ml-1 inline-block transition-transform group-hover:translate-x-1">
                        →
                      </span>
                    </p>
                    <p className="mt-auto pt-2 text-xs text-muted-foreground">
                      Name any subject and the tutor builds the deck.
                    </p>
                  </Link>
                ) : (
                  <Link
                    to="/topics"
                    key={`${c.name}-${i}`}
                    aria-hidden={i >= cards.length}
                    tabIndex={i >= cards.length ? -1 : 0}
                    className="mr-4 flex w-64 shrink-0 flex-col rounded-md border border-border bg-background p-5 transition-colors hover:bg-accent"
                  >
                    <span className="font-display text-xs text-muted-foreground">
                      {String(cards.indexOf(c) + 1).padStart(2, "0")}
                    </span>
                    <p className="mt-1 font-display text-xl">{c.name}</p>
                    <p className="mt-auto pt-2 text-xs text-muted-foreground">{c.count} starter concepts</p>
                  </Link>
                )
              )}
            </div>
          </div>
        </section>
      </main>


      <footer className="mt-auto border-t border-border py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 text-xs text-muted-foreground">
          <span>Strop.</span>
          <span>Explain it, or it doesn't count.</span>
        </div>
      </footer>
    </div>
  );
}
