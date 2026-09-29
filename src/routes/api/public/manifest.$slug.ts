import { createFileRoute } from "@tanstack/react-router";
import { publicClient } from "@/lib/public-client.server";

export const Route = createFileRoute("/api/public/manifest/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { data: app } = await publicClient()
          .from("apps")
          .select("name, slug, tagline, icon_url, source_type")
          .eq("slug", params.slug)
          .maybeSingle();
        if (!app) return new Response("Not found", { status: 404 });
        const icon = app.icon_url
          ? /^https?:/.test(app.icon_url)
            ? app.icon_url
            : `/api/public/file?path=${encodeURIComponent(app.icon_url)}`
          : "/icon-512.png";
        const manifest = {
          name: app.name,
          short_name: app.name.slice(0, 12),
          description: app.tagline ?? "",
          id: `/open/${app.slug}`,
          start_url: `/open/${app.slug}`,
          scope: `/open/${app.slug}`,
          display: "standalone",
          background_color: "#0b0b0d",
          theme_color: "#0b0b0d",
          icons: [
            { src: icon, sizes: "192x192", type: "image/png", purpose: "any" },
            { src: icon, sizes: "512x512", type: "image/png", purpose: "any maskable" },
          ],
        };
        return new Response(JSON.stringify(manifest), {
          headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=300" },
        });
      },
    },
  },
});
