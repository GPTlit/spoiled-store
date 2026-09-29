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

- Store files live in the private `store` bucket; the app references them via `/api/public/file?path=` (redirects to a signed URL) because public buckets are blocked in this workspace.
- Admin access is the `admin` role in `user_roles`, auto-granted only to the owner's verified email by a DB trigger; the `/admin` page hides itself and RLS enforces it.
- Link imports produce a Capacitor build kit zip (`src/lib/kit.server.ts`) plus a per-app installable page `/open/$slug` with its own manifest; native compiling happens outside the app (GitHub Actions workflow in the kit).
