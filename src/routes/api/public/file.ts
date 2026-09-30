import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/public/file")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const path = url.searchParams.get("path");
        const dl = url.searchParams.get("dl");
        if (!path || path.length > 500 || path.includes("..")) {
          return new Response("Bad path", { status: 400 });
        }
        const key =
          process.env["SUPABASE_PUBLISHABLE_KEY"] ||
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder";
        const sb = createClient(
          process.env["SUPABASE_URL"] || "https://placeholder.supabase.co",
          key,
          {
            auth: { persistSession: false },
            global: {
              fetch: (input, init) => {
                const h = new Headers(init?.headers);
                if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
                  h.delete("Authorization");
                h.set("apikey", key);
                return fetch(input, { ...init, headers: h });
              },
            },
          },
        );
        const { data, error } = await sb.storage
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
