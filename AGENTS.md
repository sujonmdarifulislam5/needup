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

## Architecture
- Data access uses the browser Supabase client with RLS (no server functions yet) — all rules live in RLS policies and SECURITY DEFINER triggers.
- Mount user-level live subscriptions once in AppShell; detail views own their filtered comment/help subscriptions so caches refresh without duplicate listeners.
- Replies reuse comments with a same-post top-level parent; post status is open/closed and read-only interactions are protected by database validation triggers.
- Notifications are created only by database triggers, never by the client — clients have no INSERT on notifications.
- Storage buckets are private; DB stores "bucket/path" refs resolved via signed URLs (useMediaUrl) — workspace blocks public buckets.
- Signed-in-only pages live under src/routes/_authenticated/ — the layout gates them client-side.
- Desktop shell overrides start at the xl breakpoint, with a fixed 240px navigation column, a feed capped at 680px, and a 280px community rail; preserve all smaller-screen shell styles to keep phone and tablet layouts unchanged.
