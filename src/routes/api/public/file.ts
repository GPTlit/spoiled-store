import { createFileRoute } from "@tanstack/react-router";

// Files that must never be handed out publicly (signing keys, etc.)
const PRIVATE = /(\.keystore|\.jks|\.p12|\.pem|\.key)$/i;

export const Route = createFileRoute("/api/public/file")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const path = url.searchParams.get("path");
        const dl = url.searchParams.get("dl");
        if (!path || path.length > 500 || path.includes("..") || path.startsWith("/")) {
          return new Response("Bad path", { status: 400 });
        }
        if (PRIVATE.test(path)) return new Response("Not found", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage
          .from("store")
          .createSignedUrl(path, 3600, dl ? { download: dl.slice(0, 120) } : undefined);
        if (error || !data) return new Response("Not found", { status: 404 });
        return new Response(null, {
          status: 302,
          headers: { Location: data.signedUrl, "Cache-Control": "public, max-age=1800" },
        });
      },
    },
  },
});
