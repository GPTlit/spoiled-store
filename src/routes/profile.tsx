import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StoreHeader } from "@/components/StoreHeader";
import { AppIcon } from "@/components/AppIcon";
import { useAuth } from "@/hooks/use-auth";
import type { AppRow } from "@/lib/store";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — Spoiled Store" },
      { name: "description", content: "Your Spoiled Store account, reviews, developer status and apps." },
      { property: "og:title", content: "Your profile — Spoiled Store" },
      { property: "og:description", content: "Your Spoiled Store account, reviews, developer status and apps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");

  useEffect(() => {
    if (user) setName((user.user_metadata?.full_name as string) ?? (user.user_metadata?.name as string) ?? "");
  }, [user]);

  const { data } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const uid = user!.id;
      const [fb, dev, apps] = await Promise.all([
        supabase.from("feedback").select("id, rating, comment, created_at, app_id, apps(name, slug)").eq("user_id", uid).order("created_at", { ascending: false }),
        supabase.from("developers").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("apps").select("*").eq("owner_id", uid).order("created_at", { ascending: false }),
      ]);
      return { feedback: (fb.data ?? []) as any[], developer: dev.data, apps: (apps.data ?? []) as AppRow[] };
    },
  });

  if (loading) return <div className="min-h-screen"><StoreHeader /></div>;
  if (!user)
    return (
      <div className="min-h-screen">
        <StoreHeader />
        <main className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="text-3xl font-semibold">Your profile</h1>
          <p className="mt-2 text-muted-foreground">Sign in to see your reviews, developer status and apps.</p>
          <Link to="/auth" className="mt-6 inline-block rounded-full bg-primary px-6 py-2.5 font-semibold text-primary-foreground">Sign in</Link>
        </main>
      </div>
    );

  const initial = (name || user.email || "?").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen">
      <StoreHeader />
      <main className="mx-auto max-w-4xl space-y-6 px-4 pb-24 pt-8">
        <section className="glass flex flex-wrap items-center gap-5 rounded-[2rem] p-6">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-primary text-3xl font-semibold text-primary-foreground">{initial}</div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-semibold">{name || "Spoiled user"}</h1>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-glass-strong px-3 py-1">Member since {new Date(user.created_at).toLocaleDateString()}</span>
              {isAdmin && <span className="rounded-full bg-primary px-3 py-1 text-primary-foreground">Admin</span>}
              {data?.developer && <span className="rounded-full bg-glass-strong px-3 py-1">Developer: {data.developer.status}</span>}
            </div>
          </div>
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/", replace: true }); }}
            className="flex items-center gap-1.5 rounded-full bg-glass-strong px-4 py-2 text-sm hover:bg-accent"
          ><LogOut className="h-4 w-4" /> Sign out</button>
        </section>

        <section className="glass rounded-[2rem] p-6">
          <h2 className="text-lg font-semibold">Account</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <form className="space-y-2" onSubmit={async (e) => {
              e.preventDefault();
              const { error } = await supabase.auth.updateUser({ data: { full_name: name.slice(0, 60) } });
              error ? toast.error(error.message) : toast.success("Name saved");
            }}>
              <label className="text-sm text-muted-foreground">Display name</label>
              <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} className="w-full rounded-2xl border border-input bg-glass px-4 py-2.5 text-sm outline-none focus:border-ring" />
              <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Save name</button>
            </form>
            <form className="space-y-2" onSubmit={async (e) => {
              e.preventDefault();
              if (pw.length < 8) return toast.error("Use at least 8 characters");
              const { error } = await supabase.auth.updateUser({ password: pw });
              if (error) toast.error(error.message); else { toast.success("Password updated"); setPw(""); }
            }}>
              <label className="text-sm text-muted-foreground">New password</label>
              <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="w-full rounded-2xl border border-input bg-glass px-4 py-2.5 text-sm outline-none focus:border-ring" />
              <button className="rounded-full bg-glass-strong px-4 py-2 text-sm font-semibold hover:bg-accent">Change password</button>
            </form>
          </div>
        </section>

        <section className="glass rounded-[2rem] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Developer</h2>
            <Link to="/developer" className="text-sm text-muted-foreground hover:text-foreground">Developer options →</Link>
          </div>
          {!data?.developer ? (
            <p className="mt-2 text-sm text-muted-foreground">You're not a developer yet. Subscribe to publish your own apps.</p>
          ) : data.apps.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No apps uploaded yet.</p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {data.apps.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-2xl bg-glass p-3">
                  <AppIcon app={a} />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.published ? "Live" : "Waiting for review"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="glass rounded-[2rem] p-6">
          <h2 className="text-lg font-semibold">Your reviews</h2>
          {!data?.feedback.length ? (
            <p className="mt-2 text-sm text-muted-foreground">You haven't reviewed any apps yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.feedback.map((f) => (
                <li key={f.id} className="flex items-start gap-3 rounded-2xl bg-glass p-4">
                  <div className="min-w-0 flex-1">
                    {f.apps?.slug ? (
                      <Link to="/app/$slug" params={{ slug: f.apps.slug }} className="font-medium hover:underline">{f.apps.name}</Link>
                    ) : <span className="font-medium">App</span>}
                    <div className="mt-1 flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < f.rating ? "fill-current" : "opacity-30"}`} />)}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{f.comment}</p>
                  </div>
                  <button
                    onClick={async () => {
                      const { error } = await supabase.from("feedback").delete().eq("id", f.id);
                      if (error) toast.error(error.message); else { toast.success("Review deleted"); qc.invalidateQueries({ queryKey: ["profile"] }); }
                    }}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >Delete</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
