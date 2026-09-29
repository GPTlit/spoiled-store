import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Globe, Loader2, Package, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StoreHeader } from "@/components/StoreHeader";
import { AppIcon } from "@/components/AppIcon";
import { useAuth } from "@/hooks/use-auth";
import { STATUS_LABEL, slugify, type AppRow } from "@/lib/store";
import { getCapacitorKit, inspectLink } from "@/lib/import.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Spoiled Store" },
      { name: "description", content: "Manage Spoiled Store apps." },
      { property: "og:title", content: "Admin — Spoiled Store" },
      { property: "og:description", content: "Manage Spoiled Store apps." },
      { name: "robots", content: "noindex" },
    ],
  }),
  ssr: false,
  component: AdminPage,
});

async function uploadFile(appId: string, kind: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${appId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("store").upload(path, file, { upsert: true, contentType: file.type || "application/octet-stream" });
  if (error) throw error;
  return path;
}

const input = "w-full rounded-2xl border border-input bg-glass px-4 py-2.5 text-sm outline-none focus:border-ring";

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const [tab, setTab] = useState<"apps" | "upload" | "link">("apps");
  if (loading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  if (!isAdmin)
    return (
      <div className="min-h-screen"><StoreHeader />
        <p className="mt-24 text-center text-muted-foreground">This page isn't available. <Link to="/" className="underline">Back to store</Link></p>
      </div>
    );
  return (
    <div className="min-h-screen">
      <StoreHeader />
      <main className="mx-auto max-w-5xl px-4 pb-24">
        <div className="mx-auto mt-8 flex w-fit gap-1 rounded-full glass p-1">
          {([["apps", "My apps"], ["upload", "Upload app"], ["link", "From a link"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-full px-5 py-2 text-sm font-medium transition ${tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="mt-8">
          {tab === "apps" && <AppsList />}
          {tab === "upload" && <UploadForm onDone={() => setTab("apps")} />}
          {tab === "link" && <LinkForm onDone={() => setTab("apps")} />}
        </div>
      </main>
    </div>
  );
}

function FileField({ label, accept, multiple, onChange }: { label: string; accept: string; multiple?: boolean; onChange: (f: File[]) => void }) {
  const [names, setNames] = useState<string>("");
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

function UploadForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ name: "", tagline: "", description: "", category: "Apps", version: "1.0.0", bundle_id: "" });
  const [icon, setIcon] = useState<File[]>([]);
  const [shots, setShots] = useState<File[]>([]);
  const [apk, setApk] = useState<File[]>([]);
  const [ipa, setIpa] = useState<File[]>([]);
  const [busy, setBusy] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) { toast.error("Name is required"); return; }
    try {
      setBusy("Creating app…");
      const { data: app, error } = await supabase.from("apps").insert({
        name: f.name.trim().slice(0, 80), slug: slugify(f.name), tagline: f.tagline.slice(0, 140), description: f.description.slice(0, 5000),
        category: f.category, version: f.version, bundle_id: f.bundle_id || null, source_type: "upload", build_status: "ready",
      }).select().single();
      if (error) throw error;
      const patch: Partial<AppRow> = {};
      if (icon[0]) { setBusy("Uploading icon…"); patch.icon_url = await uploadFile(app.id, "icon", icon[0]); }
      if (shots.length) {
        patch.screenshots = [];
        for (const [i, s] of shots.entries()) { setBusy(`Uploading screenshot ${i + 1}/${shots.length}…`); patch.screenshots.push(await uploadFile(app.id, `shot${i}`, s)); }
      }
      if (apk[0]) { setBusy("Uploading Android file…"); patch.apk_url = await uploadFile(app.id, "android", apk[0]); }
      if (ipa[0]) { setBusy("Uploading iPhone file…"); patch.ipa_url = await uploadFile(app.id, "ios", ipa[0]); }
      await supabase.from("apps").update(patch).eq("id", app.id);
      toast.success("Saved as draft — publish it when ready");
      qc.invalidateQueries({ queryKey: ["admin-apps"] });
      onDone();
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally { setBusy(""); }
  };

  return (
    <form onSubmit={save} className="mx-auto max-w-2xl space-y-3 rounded-[2rem] glass p-6 sm:p-8">
      <h2 className="text-2xl font-semibold">Upload an app</h2>
      <input className={input} placeholder="App name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <input className={input} placeholder="Short tagline" value={f.tagline} onChange={(e) => setF({ ...f, tagline: e.target.value })} />
      <textarea className={input} rows={4} placeholder="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      <div className="grid grid-cols-3 gap-3">
        <input className={input} placeholder="Category" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
        <input className={input} placeholder="Version" value={f.version} onChange={(e) => setF({ ...f, version: e.target.value })} />
        <input className={input} placeholder="Bundle ID (iOS)" value={f.bundle_id} onChange={(e) => setF({ ...f, bundle_id: e.target.value })} />
      </div>
      <FileField label="App icon (square PNG)" accept="image/*" onChange={setIcon} />
      <FileField label="Screenshots" accept="image/*" multiple onChange={setShots} />
      <FileField label="Android file (.apk)" accept=".apk" onChange={setApk} />
      <FileField label="iPhone file (.ipa)" accept=".ipa" onChange={setIpa} />
      <button disabled={!!busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> {busy}</> : "Save app"}
      </button>
    </form>
  );
}

function LinkForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const inspect = useServerFn(inspectLink);
  const kit = useServerFn(getCapacitorKit);
  const [url, setUrl] = useState("");
  const [steps, setSteps] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    let u = url.trim();
    if (!/^https?:\/\//.test(u)) u = "https://" + u;
    try { new URL(u); } catch { { toast.error("That link doesn't look right"); return; } }
    setRunning(true);
    setSteps(["Reading your app…"]);
    try {
      const info = await inspect({ data: { url: u } });
      setSteps((s) => [...s, `Found "${info.name}"`, "Creating store listing…"]);
      const slug = slugify(info.name);
      const { data: app, error } = await supabase.from("apps").insert({
        name: info.name, slug, tagline: info.description.slice(0, 140), description: info.description,
        icon_url: info.icon, source_type: "link", source_url: u, build_status: "importing",
        bundle_id: "app.spoiled." + slug.replace(/[^a-z0-9]/g, ""),
      }).select().single();
      if (error) throw error;
      setSteps((s) => [...s, "Packaging Android + iPhone project with Capacitor and plugins…"]);
      const z = await kit({ data: { appId: app.id } });
      await supabase.from("apps").update({ build_status: "kit_ready" }).eq("id", app.id);
      downloadB64(z.base64, z.filename);
      setSteps((s) => [...s, "Home-screen app is live (name + icon)", "Native build kit downloaded", "Done — review and publish in My apps"]);
      qc.invalidateQueries({ queryKey: ["admin-apps"] });
    } catch (err: any) {
      toast.error(err.message ?? "Import failed");
      setSteps((s) => [...s, "Failed"]);
    } finally { setRunning(false); }
  };

  return (
    <div className="mx-auto max-w-2xl rounded-[2rem] glass p-6 sm:p-8">
      <h2 className="text-2xl font-semibold">Turn a link into an app</h2>
      <p className="mt-1 text-sm text-muted-foreground">Paste your app's web link. Name, icon and description are pulled automatically, it becomes installable to the home screen, and you get a ready Capacitor project for the Android and iPhone files.</p>
      <form onSubmit={run} className="mt-5 flex gap-2">
        <input className={input} placeholder="https://myapp.com" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button disabled={running} className="flex shrink-0 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />} Build
        </button>
      </form>
      {steps.length > 0 && (
        <ol className="mt-6 space-y-2">
          {steps.map((s, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              {i === steps.length - 1 && running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-success" />} {s}
            </li>
          ))}
        </ol>
      )}
      {!running && steps.at(-1)?.startsWith("Done") && (
        <button onClick={onDone} className="mt-6 rounded-full bg-glass-strong px-5 py-2 text-sm font-semibold">Go to My apps</button>
      )}
    </div>
  );
}

function downloadB64(b64: string, name: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/zip" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function AppsList() {
  const qc = useQueryClient();
  const kit = useServerFn(getCapacitorKit);
  const { data: apps = [], isLoading } = useQuery({
    queryKey: ["admin-apps"],
    queryFn: async () => ((await supabase.from("apps").select("*").order("created_at", { ascending: false })).data ?? []) as AppRow[],
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-apps"] }); qc.invalidateQueries({ queryKey: ["apps"] }); };
  const update = async (id: string, patch: Partial<AppRow>) => {
    const { error } = await supabase.from("apps").update(patch).eq("id", id);
    if (error) toast.error(error.message); else refresh();
  };
  const attach = async (app: AppRow, kind: "android" | "ios" | "icon", files: File[]) => {
    if (!files[0]) return;
    const t = toast.loading("Uploading…");
    try {
      const path = await uploadFile(app.id, kind, files[0]);
      await update(app.id, kind === "android" ? { apk_url: path } : kind === "ios" ? { ipa_url: path } : { icon_url: path });
      toast.success("Uploaded", { id: t });
    } catch (e: any) { toast.error(e.message, { id: t }); }
  };

  if (isLoading) return <p className="text-center text-muted-foreground">Loading…</p>;
  if (!apps.length) return <p className="text-center text-muted-foreground">No apps yet — upload one or build from a link.</p>;

  return (
    <div className="space-y-4">
      {apps.map((a) => (
        <div key={a.id} className="rounded-[1.75rem] glass p-5">
          <div className="flex flex-wrap items-center gap-4">
            <AppIcon app={a} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{a.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {a.source_type === "link" ? a.source_url : "Uploaded"} · {STATUS_LABEL[a.build_status] ?? a.build_status}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${a.published ? "bg-success/20 text-success" : "bg-glass-strong text-muted-foreground"}`}>
              {a.published ? "Live" : "Draft"}
            </span>
            <button onClick={() => update(a.id, { published: !a.published })} className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">
              {a.published ? "Unpublish" : "Publish"}
            </button>
          </div>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
            <StatusPill ok={!!a.apk_url} label="Android .apk" />
            <StatusPill ok={!!a.ipa_url} label="iPhone .ipa" />
            <StatusPill ok={!!a.source_url} label="Home-screen app" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <MiniUpload label={a.apk_url ? "Replace .apk" : "Add .apk"} accept=".apk" onFile={(f) => attach(a, "android", f)} />
            <MiniUpload label={a.ipa_url ? "Replace .ipa" : "Add .ipa"} accept=".ipa" onFile={(f) => attach(a, "ios", f)} />
            <MiniUpload label="Change icon" accept="image/*" onFile={(f) => attach(a, "icon", f)} />
            {a.source_type === "link" && (
              <button onClick={async () => { const z = await kit({ data: { appId: a.id } }); downloadB64(z.base64, z.filename); }} className="flex items-center gap-1.5 rounded-full bg-glass-strong px-3 py-1.5 hover:bg-accent">
                <Package className="h-4 w-4" /> Build kit
              </button>
            )}
            <Link to="/app/$slug" params={{ slug: a.slug }} className="rounded-full bg-glass-strong px-3 py-1.5 hover:bg-accent">View</Link>
            <button onClick={async () => { if (confirm(`Delete ${a.name}?`)) { await supabase.from("apps").delete().eq("id", a.id); refresh(); } }} className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-2xl px-3 py-2 ${ok ? "bg-success/10 text-success" : "bg-glass text-muted-foreground"}`}>
      {ok ? <Check className="h-4 w-4" /> : <span className="h-4 w-4 rounded-full border border-current" />} {label}
    </div>
  );
}

function MiniUpload({ label, accept, onFile }: { label: string; accept: string; onFile: (f: File[]) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 rounded-full bg-glass-strong px-3 py-1.5 hover:bg-accent">
      <Upload className="h-4 w-4" /> {label}
      <input type="file" hidden accept={accept} onChange={(e) => onFile(Array.from(e.target.files ?? []))} />
    </label>
  );
}
