import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppIcon } from "@/components/AppIcon";
import { detectPlatform, fileUrl, type AppRow } from "@/lib/store";

type BIP = Event & { prompt: () => Promise<void> };

export const Route = createFileRoute("/open/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: params.slug.replace(/-[a-z0-9]{4}$/, "").replace(/-/g, " ") },
      { name: "description", content: "Open this Spoiled Store app." },
      { property: "og:title", content: "Spoiled Store app" },
      { property: "og:description", content: "Add this app to your home screen." },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
    links: [{ rel: "manifest", href: `/api/public/manifest/${params.slug}` }],
  }),
  component: OpenApp,
});

function OpenApp() {
  const { slug } = Route.useParams();
  const [standalone, setStandalone] = useState(false);
  const [prompt, setPrompt] = useState<BIP | null>(null);
  const [platform, setPlatform] = useState("desktop");

  const { data: app } = useQuery({
    queryKey: ["app", slug],
    queryFn: async () => (await supabase.from("apps").select("*").eq("slug", slug).maybeSingle()).data as AppRow | null,
  });

  useEffect(() => {
    setPlatform(detectPlatform());
    setStandalone(window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true);
    const h = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BIP);
    };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  // Per-app home screen icon + name for iPhone
  useEffect(() => {
    if (!app) return;
    const set = (sel: string, make: () => HTMLElement, attr: string, val: string) => {
      let el = document.head.querySelector(sel) as HTMLElement | null;
      if (!el) { el = make(); document.head.appendChild(el); }
      el.setAttribute(attr, val);
    };
    const icon = fileUrl(app.icon_url) ?? "/icon-192.png";
    document.head.querySelectorAll('link[rel="apple-touch-icon"]').forEach((l) => l.setAttribute("href", icon));
    set('meta[name="apple-mobile-web-app-title"]', () => Object.assign(document.createElement("meta"), { name: "apple-mobile-web-app-title" }), "content", app.name);
    document.title = app.name;
  }, [app]);

  if (!app) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;

  if (standalone && app.source_url) {
    return <iframe src={app.source_url} title={app.name} className="fixed inset-0 h-full w-full border-0" allow="camera; microphone; geolocation; clipboard-write; fullscreen" />;
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm rounded-[2rem] glass-strong p-8 text-center">
        <div className="flex justify-center"><AppIcon app={app} size="xl" /></div>
        <h1 className="mt-4 text-2xl font-semibold">{app.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{app.tagline}</p>
        {prompt ? (
          <button onClick={() => prompt.prompt()} className="mt-6 w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground">
            Install {app.name}
          </button>
        ) : platform === "ios" ? (
          <div className="mt-6 rounded-2xl bg-glass p-4 text-left text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Install on iPhone</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Tap the Share button in Safari</li>
              <li>Choose "Add to Home Screen"</li>
              <li>Tap Add — {app.name} appears with its icon</li>
            </ol>
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">Use your browser menu → "Install app" or "Add to Home screen".</p>
        )}
        {app.source_url && (
          <a href={app.source_url} className="mt-4 block text-sm text-muted-foreground hover:text-foreground">Open in browser instead</a>
        )}
      </div>
    </div>
  );
}
