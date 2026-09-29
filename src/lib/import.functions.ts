import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildCapacitorKit } from "./kit.server";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

function pick(html: string, re: RegExp) {
  const m = html.match(re);
  return m?.[1]?.trim();
}
function decode(s?: string) {
  return s?.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

/** Reads a website and extracts its name, description and icon. */
export const inspectLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ url: z.string().url().max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const target = new URL(data.url);
    if (!/^https?:$/.test(target.protocol)) throw new Error("Only http(s) links");
    let html = "";
    try {
      const res = await fetch(target, { headers: { "User-Agent": "SpoiledStoreBot/1.0" }, redirect: "follow" });
      html = (await res.text()).slice(0, 400_000);
    } catch {
      return { name: target.hostname, description: "", icon: null as string | null, reachable: false };
    }
    const abs = (u?: string) => (u ? new URL(decode(u)!, target).toString() : undefined);
    let name =
      decode(pick(html, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)/i)) ||
      decode(pick(html, /<meta[^>]+name=["']application-name["'][^>]+content=["']([^"']+)/i)) ||
      decode(pick(html, /<title[^>]*>([^<]+)<\/title>/i)) ||
      target.hostname;
    const description =
      decode(pick(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)) ||
      decode(pick(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i)) ||
      "";
    let icon =
      abs(pick(html, /<link[^>]+rel=["']apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)/i)) ||
      abs(pick(html, /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon/i));
    const manifestHref = abs(pick(html, /<link[^>]+rel=["']manifest["'][^>]+href=["']([^"']+)/i));
    if (manifestHref) {
      try {
        const m = await (await fetch(manifestHref)).json();
        if (m.name) name = m.name;
        const best = (m.icons || []).sort((a: any, b: any) => parseInt(b.sizes) - parseInt(a.sizes))[0];
        if (best?.src && !icon) icon = new URL(best.src, manifestHref).toString();
      } catch {}
    }
    if (!icon) icon = abs(pick(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i));
    if (!icon) icon = abs(pick(html, /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)/i));
    return { name: name.slice(0, 80), description: description.slice(0, 1000), icon: icon ?? null, reachable: true };
  });

/** Produces a ready-to-build Capacitor project (Android + iOS) as a base64 zip. */
export const getCapacitorKit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ appId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: app, error } = await context.supabase.from("apps").select("*").eq("id", data.appId).single();
    if (error || !app) throw new Error("App not found");
    const zip = buildCapacitorKit({
      name: app.name,
      slug: app.slug,
      url: app.source_url ?? "",
      bundleId: app.bundle_id ?? "app.spoiled." + app.slug.replace(/[^a-z0-9]/g, ""),
      version: app.version ?? "1.0.0",
    });
    return { filename: `${app.slug}-capacitor.zip`, base64: Buffer.from(zip).toString("base64") };
  });
