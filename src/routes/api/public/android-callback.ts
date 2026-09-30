import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { checkToken } from "@/lib/github.server";

const Body = z.object({ appId: z.string().uuid(), token: z.string().min(10).max(200), status: z.enum(["ready", "failed"]) });

export const Route = createFileRoute("/api/public/android-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Bad request", { status: 400 });
        const { appId, token, status } = parsed.data;
        if (!checkToken(appId, token)) return new Response("Unauthorized", { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const patch = status === "ready"
          ? { apk_url: `${appId}/android-native.apk`, build_status: "ready" }
          : { build_status: "failed" };
        const { error } = await supabaseAdmin.from("apps").update(patch).eq("id", appId);
        if (error) return new Response("Update failed", { status: 500 });
        return new Response("ok");
      },
    },
  },
});
