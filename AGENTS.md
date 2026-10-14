<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Concept selection lives in the pure function `src/lib/selection.ts` (unit-tested); server functions in `src/lib/learn.functions.ts` only fetch rows and persist. Why: keeps the no-repeat/retry rules testable.
- AI calls go through `src/lib/ai.server.ts` (streamed Responses, JSON parsed from text) and are imported dynamically inside handlers. Why: keeps the key and prompts server-only.
- Public pages render their sign-in affordance from the client-only `useSession()` hook (`src/hooks/use-session.ts`), never a static "Sign in" link. Why: a static link makes a successful sign-in look broken; the hook resolves after hydration so no wrong state flashes.
