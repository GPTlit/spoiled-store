import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Clock, Code2, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StoreHeader } from "@/components/StoreHeader";
import { AppIcon } from "@/components/AppIcon";
import { useAuth } from "@/hooks/use-auth";
import { slugify, type AppRow } from "@/lib/store";
import type { Database } from "@/integrations/supabase/types";

type DevRow = Database["public"]["Tables"]["developers"]["Row"];

export const Route = createFileRoute("/developer")({
  head: () => ({
    meta: [
      { title: "Developer options — Spoiled Store" },
      { name: "description", content: "Join Spoiled Store as a developer and publish your own apps for $4.99 a month." },
      { property: "og:title", content: "Developer options — Spoiled Store" },
      { property: "og:description", content: "Join Spoiled Store as a developer and publish your own apps for $4.99 a month." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  component: DeveloperPage,
});

const input = "w-full rounded-2xl border border-input bg-glass px-4 py-2.5 text-sm outline-none focus:border-ring";

function DeveloperPage() {
  const { user, loading } = useAuth();
  const { data: dev, isLoading } = useQuery({
    queryKey: ["developer", user?.id],
    enabled: !!user,
    queryFn: async () => ((await supabase.from("developers").select("*").eq("user_id", user!.id).maybeSingle()).data as DevRow | null),
  });

  return (
    <div className="min-h-screen">
      <StoreHeader />
      <main className="mx-auto max-w-2xl px-4 pb-24">
        <div className="mt-10 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary"><Code2 className="h-6 w-6" /></span>
          <div>
            <h1 className="text-3xl font-semibold">Developer options</h1>
            <p className="text-sm text-muted-foreground">Publish your own apps on Spoiled Store.</p>
          </div>
        </div>

        {loading || (user && isLoading) ? (
          <p className="mt-16 text-center text-muted-foreground">Loading…</p>
        ) : !user ? (
          <div className="mt-8 rounded-[2rem] glass p-8 text-center">
            <p className="text-muted-foreground">Sign in to become a Spoiled developer.</p>
            <Link to="/auth" className="mt-5 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">Sign in</Link>
          </div>
        ) : !dev ? (
          <JoinForm />
        ) : dev.status === "active" ? (
          <ActiveDeveloper dev={dev} />
        ) : dev.status === "rejected" ? (
          <div className="mt-8 rounded-[2rem] glass p-8 text-center text-muted-foreground">
            Your developer request wasn't approved. Reach out if you think that's a mistake.
          </div>
        ) : (
          <div className="mt-8 rounded-[2rem] glass p-8 text-center">
            <Clock className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-semibold">Request received</p>
            <p className="mt-1 text-sm text-muted-foreground">We're reviewing your developer account. You'll be able to upload apps as soon as it's approved.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function JoinForm() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [busy, setBusy] = useState(false);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Enter a developer name"); return; }
    setBusy(true);
    const { error } = await supabase.from("developers").insert({
      user_id: user!.id,
      display_name: name.trim().slice(0, 60),
      contact_email: email.trim().slice(0, 200) || null,
      status: "pending",
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Request sent");
    qc.invalidateQueries({ queryKey: ["developer"] });
  };

  return (
    <form onSubmit={join} className="mt-8 space-y-4 rounded-[2rem] glass p-6 sm:p-8">
      <div className="rounded-2xl bg-glass-strong p-5">
        <p className="text-3xl font-semibold">$4.99<span className="text-base font-normal text-muted-foreground"> / month</span></p>
        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          <li className="flex gap-2"><Check className="h-4 w-4 text-success" /> Upload your own apps with screenshots</li>
          <li className="flex gap-2"><Check className="h-4 w-4 text-success" /> Android .apk and iPhone .ipa downloads</li>
          <li className="flex gap-2"><Check className="h-4 w-4 text-success" /> Your app appears in Apps and News once approved</li>
        </ul>
      </div>
      <input className={input} placeholder="Developer or studio name" value={name} onChange={(e) => setName(e.target.value)} />
      <input className={input} placeholder="Contact email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Request developer access
      </button>
      <p className="text-center text-xs text-muted-foreground">Every developer account is reviewed before it goes live.</p>
    </form>
  );
}

async function uploadFile(appId: string, kind: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${appId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("store").upload(path, file, { upsert: true, contentType: file.type || "application/octet-stream" });
  if (error) throw error;
  return path;
}

function FileField({ label, accept, multiple, onChange }: { label: string; accept: string; multiple?: boolean; onChange: (f: File[]) => void }) {
  const [names, setNames] = useState("");
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-glass-edge bg-glass px-4 py-3 text-sm hover:bg-glass-strong">
      <Upload className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{names || label}</span>
      <input type="file" hidden accept={accept} multiple={multiple} onChange={(e) => {
        const fs = Array.from(e.target.files ?? []);
        setNames(fs.map((f) => f.name).join(", "));
        onChange(fs);
      }} />
    </label>
  );
}

function ActiveDeveloper({ dev }: { dev: DevRow }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [f, setF] = useState({ name: "", tagline: "", description: "", category: "Apps", version: "1.0.0" });
  const [icon, setIcon] = useState<File[]>([]);
  const [shots, setShots] = useState<File[]>([]);
  const [apk, setApk] = useState<File[]>([]);
  const [ipa, setIpa] = useState<File[]>([]);
  const [busy, setBusy] = useState("");

  const { data: mine = [] } = useQuery({
    queryKey: ["my-apps", user?.id],
    queryFn: async () => ((await supabase.from("apps").select("*").eq("owner_id", user!.id).order("created_at", { ascending: false })).data ?? []) as AppRow[],
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) { toast.error("App name is required"); return; }
    try {
      setBusy("Creating app…");
      const { data: app, error } = await supabase.from("apps").insert({
        name: f.name.trim().slice(0, 80), slug: slugify(f.name), tagline: f.tagline.slice(0, 140), description: f.description.slice(0, 5000),
        category: f.category, version: f.version, source_type: "upload", build_status: "ready",
        owner_id: user!.id, published: false,
      }).select().single();
      if (error) throw error;
      const patch: Partial<Database["public"]["Tables"]["apps"]["Update"]> = {};
      if (icon[0]) { setBusy("Uploading icon…"); patch["icon_url"] = await uploadFile(app.id, "icon", icon[0]); }
      if (shots.length) {
        const list: string[] = [];
        for (const [i, s] of shots.entries()) { setBusy(`Uploading screenshot ${i + 1}/${shots.length}…`); list.push(await uploadFile(app.id, `shot${i}`, s)); }
        patch["screenshots"] = list;
      }
      if (apk[0]) { setBusy("Uploading Android file…"); patch["apk_url"] = await uploadFile(app.id, "android", apk[0]); }
      if (ipa[0]) { setBusy("Uploading iPhone file…"); patch["ipa_url"] = await uploadFile(app.id, "ios", ipa[0]); }
      if (Object.keys(patch).length) await supabase.from("apps").update(patch).eq("id", app.id);
      toast.success("Sent for review");
      setF({ name: "", tagline: "", description: "", category: "Apps", version: "1.0.0" });
      qc.invalidateQueries({ queryKey: ["my-apps"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally { setBusy(""); }
  };

  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-center gap-2 rounded-full bg-success/10 px-4 py-2 text-sm text-success">
        <Check className="h-4 w-4" /> Developer account active — {dev.display_name}
      </div>

      <form onSubmit={save} className="space-y-3 rounded-[2rem] glass p-6 sm:p-8">
        <h2 className="text-2xl font-semibold">Upload an app</h2>
        <input className={input} placeholder="App name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className={input} placeholder="Short tagline" value={f.tagline} onChange={(e) => setF({ ...f, tagline: e.target.value })} />
        <textarea className={input} rows={4} placeholder="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <input className={input} placeholder="Category" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
          <input className={input} placeholder="Version" value={f.version} onChange={(e) => setF({ ...f, version: e.target.value })} />
        </div>
        <FileField label="App icon (square PNG)" accept="image/*" onChange={setIcon} />
        <FileField label="Screenshots" accept="image/*" multiple onChange={setShots} />
        <FileField label="Android file (.apk)" accept=".apk" onChange={setApk} />
        <FileField label="iPhone file (.ipa)" accept=".ipa" onChange={setIpa} />
        <button disabled={!!busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> {busy}</> : "Send for review"}
        </button>
      </form>

      <div>
        <h2 className="mb-3 text-xl font-semibold">Your apps</h2>
        {mine.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing uploaded yet.</p>
        ) : (
          <div className="space-y-3">
            {mine.map((a) => (
              <div key={a.id} className="flex items-center gap-4 rounded-[1.5rem] glass p-4">
                <AppIcon app={a} />
                <p className="min-w-0 flex-1 truncate font-semibold">{a.name}</p>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${a.published ? "bg-success/20 text-success" : "bg-glass-strong text-muted-foreground"}`}>
                  {a.published ? "Live" : "In review"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
