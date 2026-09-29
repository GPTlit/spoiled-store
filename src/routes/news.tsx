import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StoreHeader } from "@/components/StoreHeader";
import { AppIcon } from "@/components/AppIcon";
import { fileUrl, type AppRow } from "@/lib/store";
import type { Database } from "@/integrations/supabase/types";

type NewsRow = Database["public"]["Tables"]["news"]["Row"];

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "News — Spoiled Store" },
      { name: "description", content: "Announcements from Spoiled Store plus every app that just landed." },
      { property: "og:title", content: "News — Spoiled Store" },
      { property: "og:description", content: "Announcements from Spoiled Store plus every app that just landed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewsPage,
});

const when = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

function NewsPage() {
  const { data: posts = [] } = useQuery({
    queryKey: ["news"],
    queryFn: async () => ((await supabase.from("news").select("*").order("created_at", { ascending: false })).data ?? []) as NewsRow[],
  });
  const { data: apps = [] } = useQuery({
    queryKey: ["apps", "published"],
    queryFn: async () => ((await supabase.from("apps").select("*").eq("published", true).order("created_at", { ascending: false })).data ?? []) as AppRow[],
  });

  const items = [
    ...posts.map((p) => ({ kind: "post" as const, at: p.created_at, post: p })),
    ...apps.map((a) => ({ kind: "app" as const, at: a.created_at, app: a })),
  ].sort((x, y) => +new Date(y.at) - +new Date(x.at));

  return (
    <div className="min-h-screen">
      <StoreHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24">
        <h1 className="mt-8 text-4xl font-semibold">News</h1>
        <p className="mt-1 text-muted-foreground">Store announcements and every new app as it arrives.</p>

        {items.length === 0 && <p className="mt-16 text-center text-muted-foreground">Nothing yet.</p>}

        <div className="mt-8 space-y-4">
          {items.map((it) =>
            it.kind === "post" ? (
              <article key={it.post.id} className="overflow-hidden rounded-[1.75rem] glass">
                {it.post.cover_url && <img src={fileUrl(it.post.cover_url)} alt="" className="h-48 w-full object-cover" />}
                <div className="p-6">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{when(it.post.created_at)}</p>
                  <h2 className="mt-2 text-2xl font-semibold">{it.post.title}</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{it.post.body}</p>
                </div>
              </article>
            ) : (
              <Link
                key={it.app.id}
                to="/app/$slug"
                params={{ slug: it.app.slug }}
                className="flex items-center gap-4 rounded-[1.75rem] glass p-5 transition hover:bg-glass-strong"
              >
                <AppIcon app={it.app} />
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5" /> New app · {when(it.app.created_at)}
                  </p>
                  <p className="mt-1 truncate text-lg font-semibold">{it.app.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{it.app.tagline}</p>
                </div>
              </Link>
            ),
          )}
        </div>
      </main>
    </div>
  );
}
