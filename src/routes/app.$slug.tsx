import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronLeft, Download, Smartphone, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { StoreHeader } from "@/components/StoreHeader";
import { AppIcon } from "@/components/AppIcon";
import { useAuth } from "@/hooks/use-auth";
import { detectPlatform, fileUrl, type AppRow, type FeedbackRow, type Platform } from "@/lib/store";

export const Route = createFileRoute("/app/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-[a-z0-9]{4}$/, "").replace(/-/g, " ")} — Spoiled Store` },
      { name: "description", content: "Download this app for Android or iPhone on Spoiled Store." },
      { property: "og:title", content: "Get it on Spoiled Store" },
      { property: "og:description", content: "Download this app for Android or iPhone on Spoiled Store." },
    ],
  }),
  component: AppPage,
});

function AppPage() {
  const { slug } = Route.useParams();
  const [platform, setPlatform] = useState<Platform>("desktop");
  useEffect(() => setPlatform(detectPlatform()), []);

  const { data: app, isLoading } = useQuery({
    queryKey: ["app", slug],
    queryFn: async () => {
      const { data } = await supabase.from("apps").select("*").eq("slug", slug).maybeSingle();
      return data as AppRow | null;
    },
  });

  if (isLoading) return <Shell><p className="mt-20 text-center text-muted-foreground">Loading…</p></Shell>;
  if (!app) return <Shell><p className="mt-20 text-center text-muted-foreground">App not found.</p></Shell>;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const iosLink = app.ipa_url ? `itms-services://?action=download-manifest&url=${encodeURIComponent(`${origin}/api/public/ios/${app.slug}`)}` : null;
  const apkLink = app.apk_url ? fileUrl(app.apk_url, `${app.name}.apk`) : null;
  const hasWeb = !!app.source_url;

  return (
    <Shell>
      <Link to="/" className="mt-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Store
      </Link>
      <section className="mt-4 flex flex-col gap-6 rounded-[2rem] glass p-6 sm:flex-row sm:items-center sm:p-8">
        <AppIcon app={app} size="xl" />
        <div className="flex-1">
          <h1 className="text-3xl font-semibold sm:text-4xl">{app.name}</h1>
          <p className="mt-1 text-muted-foreground">{app.tagline}</p>
          <p className="mt-1 text-xs text-muted-foreground">{app.category} · v{app.version}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {(platform !== "ios" || !iosLink) && apkLink && (platform === "android" || platform === "desktop") && (
              <a href={apkLink} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
                <Download className="h-4 w-4" /> Download for Android
              </a>
            )}
            {iosLink && (platform === "ios" || platform === "desktop") && (
              <a href={iosLink} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
                <Download className="h-4 w-4" /> Install on iPhone
              </a>
            )}
            {hasWeb && (
              <a href={`/open/${app.slug}`} className="inline-flex items-center gap-2 rounded-full bg-glass-strong px-5 py-2.5 text-sm font-semibold hover:bg-accent">
                <Smartphone className="h-4 w-4" /> Add to Home Screen
              </a>
            )}
            {!apkLink && !iosLink && !hasWeb && <span className="text-sm text-muted-foreground">Coming soon</span>}
          </div>
          {platform === "ios" && !iosLink && hasWeb && (
            <p className="mt-3 text-xs text-muted-foreground">On iPhone: tap Add to Home Screen, then Share → "Add to Home Screen".</p>
          )}
        </div>
      </section>

      {app.screenshots.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-semibold">Preview</h2>
          <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 no-scrollbar">
            {app.screenshots.map((s) => (
              <img key={s} src={fileUrl(s)} alt="" className="h-96 shrink-0 snap-start rounded-3xl border border-glass-edge object-cover" />
            ))}
          </div>
        </section>
      )}

      {app.description && (
        <section className="mt-8 rounded-3xl glass p-6">
          <h2 className="mb-2 text-xl font-semibold">About</h2>
          <p className="whitespace-pre-line text-muted-foreground">{app.description}</p>
        </section>
      )}

      <Feedback appId={app.id} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <StoreHeader />
      <main className="mx-auto max-w-4xl px-4 pb-24">{children}</main>
    </div>
  );
}

function Feedback({ appId }: { appId: string }) {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const { data: items = [] } = useQuery({
    queryKey: ["feedback", appId],
    queryFn: async () => {
      const { data } = await supabase.from("feedback").select("*").eq("app_id", appId).order("created_at", { ascending: false });
      return (data ?? []) as FeedbackRow[];
    },
  });
  const avg = items.length ? items.reduce((s, i) => s + i.rating, 0) / items.length : 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = comment.trim();
    if (!user || !text || text.length > 1000) return;
    const { error } = await supabase.from("feedback").insert({
      app_id: appId,
      user_id: user.id,
      author_name: (user.user_metadata?.["full_name"] as string) || user.email?.split("@")[0] || null,
      rating,
      comment: text,
    });
    if (error) { toast.error(error.message); return; }
    setComment("");
    qc.invalidateQueries({ queryKey: ["feedback", appId] });
  };

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-xl font-semibold">Ratings & Feedback</h2>
        {items.length > 0 && <p className="text-sm text-muted-foreground">{avg.toFixed(1)} ★ · {items.length}</p>}
      </div>
      {user ? (
        <form onSubmit={submit} className="rounded-3xl glass p-5">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}>
                <Star className={`h-6 w-6 ${n <= rating ? "fill-foreground text-foreground" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} rows={3} placeholder="Share your thoughts…" className="mt-3 w-full resize-none rounded-2xl border border-input bg-glass p-3 text-sm outline-none focus:border-ring" />
          <button className="mt-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Post</button>
        </form>
      ) : (
        <Link to="/auth" className="block rounded-3xl glass p-5 text-center text-sm text-muted-foreground hover:text-foreground">
          Sign in to leave feedback
        </Link>
      )}
      <div className="mt-4 space-y-3">
        {items.map((f) => (
          <div key={f.id} className="rounded-3xl glass p-5">
            <div className="flex items-center justify-between">
              <p className="font-medium">{f.author_name || "User"}</p>
              <div className="flex items-center gap-3">
                <span className="text-sm">{"★".repeat(f.rating)}<span className="text-muted-foreground">{"★".repeat(5 - f.rating)}</span></span>
                {(f.user_id === user?.id || isAdmin) && (
                  <button
                    aria-label="Delete"
                    onClick={async () => {
                      await supabase.from("feedback").delete().eq("id", f.id);
                      qc.invalidateQueries({ queryKey: ["feedback", appId] });
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </button>
                )}
              </div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{f.comment}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
