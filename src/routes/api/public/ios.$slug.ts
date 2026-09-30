import { createFileRoute } from "@tanstack/react-router";
import { bundleIdFor, publicClient } from "@/lib/public-client.server";

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);

// Over-the-air install manifest for iPhone (itms-services).
export const Route = createFileRoute("/api/public/ios/$slug")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const { data: app } = await publicClient()
          .from("apps")
          .select("name, slug, version, ipa_url, bundle_id")
          .eq("slug", params.slug)
          .maybeSingle();
        if (!app?.ipa_url) return new Response("Not found", { status: 404 });
        const origin = new URL(request.url).origin;
        const ipa = `${origin}/api/public/file?path=${encodeURIComponent(app.ipa_url)}&dl=${encodeURIComponent(app.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-spoiled.ipa")}`;
        const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>items</key><array><dict>
<key>assets</key><array><dict><key>kind</key><string>software-package</string><key>url</key><string>${esc(ipa)}</string></dict></array>
<key>metadata</key><dict>
<key>bundle-identifier</key><string>${esc(app.bundle_id || bundleIdFor(app.slug))}</string>
<key>bundle-version</key><string>${esc(app.version || "1.0.0")}</string>
<key>kind</key><string>software</string>
<key>title</key><string>${esc(app.name)}</string>
</dict></dict></array></dict></plist>`;
        return new Response(plist, { headers: { "Content-Type": "application/xml" } });
      },
    },
  },
});
