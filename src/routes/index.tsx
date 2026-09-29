import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StoreHeader } from "@/components/StoreHeader";
import { fileUrl, type AppRow } from "@/lib/store";
import logo from "@/assets/spoiled.png.asset.json";
import { AppIcon } from "@/components/AppIcon";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Spoiled Store — Apps for Android & iPhone" },
      { name: "description", content: "Download Spoiled apps straight to your Android or iPhone." },
      { property: "og:title", content: "Spoiled Store" },
      { property: "og:description", content: "Download Spoiled apps straight to your Android or iPhone." },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: apps = [], isLoading } = useQuery({
    queryKey: ["apps", "published"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apps")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AppRow[];
    },
  });
  const featured = apps[0];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center opacity-[0.12] grayscale"
        style={{ backgroundImage: `url(${logo.url})` }}
      />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-background/40 via-background/80 to-background" />
      <StoreHeader />

      <main className="mx-auto max-w-6xl px-4 pb-24">
        {/* Hero */}
        <section className="relative mt-6 overflow-hidden rounded-[2rem] glass">
          <img src={featured?.screenshots?.[0] ? fileUrl(featured.screenshots[0]) : logo.url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="relative flex min-h-[380px] flex-col justify-end p-6 sm:p-10">
            {featured ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Featured</p>
                <div className="mt-3 flex items-center gap-4">
                  <AppIcon app={featured} size="lg" />
                  <div>
                    <h1 className="text-4xl font-semibold sm:text-5xl">{featured.name}</h1>
                    <p className="mt-1 text-muted-foreground">{featured.tagline}</p>
                  </div>
                </div>
                <Link to="/app/$slug" params={{ slug: featured.slug }} className="mt-6 w-fit rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">
                  Get
                </Link>
              </>
            ) : (
              <>
                <h1 className="text-5xl font-semibold sm:text-6xl">Spoiled Store</h1>
                <p className="mt-2 max-w-md text-muted-foreground">{isLoading ? "Loading apps…" : "New apps are on the way."}</p>
              </>
            )}
          </div>
        </section>

        {apps.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 text-2xl font-semibold">All apps</h2>
            <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 no-scrollbar">
              {apps.map((a) => (
                <Link key={a.id} to="/app/$slug" params={{ slug: a.slug }} className="group w-72 shrink-0 snap-start">
                  <div className="aspect-video overflow-hidden rounded-3xl glass transition-transform duration-300 group-hover:scale-[1.03]">
                    {a.screenshots?.[0] ? (
                      <img src={fileUrl(a.screenshots[0])} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center"><AppIcon app={a} size="lg" /></div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <AppIcon app={a} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{a.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{a.category}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {apps.map((a) => (
                <Link key={a.id} to="/app/$slug" params={{ slug: a.slug }} className="flex items-center gap-4 rounded-3xl glass p-4 transition hover:bg-glass-strong">
                  <AppIcon app={a} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{a.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{a.tagline || a.category}</p>
                  </div>
                  <span className="rounded-full bg-glass-strong px-4 py-1 text-sm font-semibold">Get</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
