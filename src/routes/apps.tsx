import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StoreHeader } from "@/components/StoreHeader";
import { AppIcon } from "@/components/AppIcon";
import type { AppRow } from "@/lib/store";

export const Route = createFileRoute("/apps")({
  validateSearch: (s: Record<string, unknown>): { q?: string } =>
    typeof s["q"] === "string" && s["q"] ? { q: s["q"] } : {},
  head: () => ({
    meta: [
      { title: "Apps — Spoiled Store" },
      {
        name: "description",
        content: "Browse every app in the Spoiled Store and install it on your Android or iPhone.",
      },
      { property: "og:title", content: "Apps — Spoiled Store" },
      {
        property: "og:description",
        content: "Browse every app in the Spoiled Store and install it on your Android or iPhone.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AppsPage,
});

function AppsPage() {
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q ?? "");
  useEffect(() => setQ(search.q ?? ""), [search.q]);
  const [cat, setCat] = useState("All");
  const { data: apps = [], isLoading } = useQuery({
    queryKey: ["apps", "published"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("apps")
          .select("*")
          .eq("published", true)
          .order("created_at", { ascending: false });
        if (error) {
          console.warn("[apps] Query error:", error.message);
          return [];
        }
        return (data as AppRow[]) || [];
      } catch (e) {
        console.warn("[apps] Fetch error:", e);
        return [];
      }
    },
  });

  const cats = ["All", ...Array.from(new Set(apps.map((a) => a.category ?? "Apps")))];
  const shown = apps.filter(
    (a) =>
      (cat === "All" || (a.category ?? "Apps") === cat) &&
      (a.name + " " + (a.tagline ?? "")).toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="min-h-screen">
      <StoreHeader />
      <main className="mx-auto max-w-6xl px-4 pb-24">
        <h1 className="mt-8 text-4xl font-semibold">Apps</h1>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search apps"
          autoFocus
          className="mt-5 w-full rounded-2xl border border-input bg-glass px-4 py-2.5 text-sm outline-none focus:border-ring"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${cat === c ? "bg-primary text-primary-foreground" : "bg-glass-strong text-muted-foreground hover:text-foreground"}`}
            >
              {c}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="mt-16 text-center text-muted-foreground">Loading…</p>
        ) : shown.length === 0 ? (
          <p className="mt-16 text-center text-muted-foreground">No apps here yet.</p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((a) => (
              <Link
                key={a.id}
                to="/app/$slug"
                params={{ slug: a.slug }}
                className="flex items-center gap-4 rounded-[1.75rem] glass p-4 transition hover:bg-glass-strong"
              >
                <AppIcon app={a} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{a.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {a.tagline || a.category}
                  </p>
                </div>
                <span className="ml-auto shrink-0 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">
                  Get
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
