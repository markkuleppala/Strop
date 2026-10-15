import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";

export function Logo() {
  return (
    <Link to="/" className="flex items-baseline gap-1 font-display text-2xl font-semibold tracking-tight">
      Strop<span className="text-primary">.</span>
    </Link>
  );
}

export function AppHeader() {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onTopics = pathname === "/topics" || pathname.startsWith("/topics/");
  const { session } = useSession();
  const email = session?.user.email;
  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await router.invalidate();
    navigate({ to: "/auth", replace: true });
  };
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Logo />
        <nav className="flex items-center gap-2">
          {!onTopics && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/topics">Topics</Link>
            </Button>
          )}
          {pathname !== "/progress" && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/progress">Progress</Link>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </nav>
      </div>
    </header>
  );
}
