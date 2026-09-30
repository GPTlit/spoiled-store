import { unzipSync } from "fflate";

const BUILDER = "https://pwabuilder-cloudapk.azurewebsites.net/generateAppPackage";
export const STORE_ORIGIN = "https://spoiled-store.lovable.app";

type Input = {
  name: string;
  slug: string;
  url: string;
  packageId: string;
  version: string;
  iconUrl: string;
  manifestUrl: string;
  keystore?: Uint8Array | null;
};

/** Finds the site's own web manifest, if it has one. */
export async function findManifest(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "SpoiledStoreBot/1.0" },
      redirect: "follow",
    });
    const html = (await res.text()).slice(0, 400_000);
    const m =
      html.match(/<link[^>]+rel=["']manifest["'][^>]+href=["']([^"']+)/i) ||
      html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']manifest/i);
    if (!m) return null;
    const href = new URL((m[1] ?? "").replace(/&amp;/g, "&"), res.url || url).toString();
    const check = await fetch(href);
    if (!check.ok) return null;
    await check.json();
    return href;
  } catch {
    return null;
  }
}

/** Builds a signed Android .apk for a website (Trusted Web Activity). */
export async function buildAndroidApk(k: Input) {
  const target = new URL(k.url);
  const pass = "spoiled-" + k.packageId.replace(/[^a-z0-9]/gi, "").slice(0, 20);
  const minor = k.version.split(".").map((n) => parseInt(n) || 0);
  const versionCode = Math.max(
    1,
    (minor[0] ?? 1) * 10000 + (minor[1] ?? 0) * 100 + (minor[2] ?? 0),
  );
  const body = {
    packageId: k.packageId,
    name: k.name.slice(0, 50),
    launcherName: k.name.slice(0, 30),
    appVersion: k.version,
    appVersionCode: versionCode,
    host: target.origin,
    pwaUrl: target.toString(),
    startUrl: target.pathname + target.search || "/",
    fullScopeUrl: target.origin + "/",
    webManifestUrl: k.manifestUrl,
    iconUrl: k.iconUrl,
    maskableIconUrl: null,
    monochromeIconUrl: null,
    themeColor: "#0b0b0d",
    themeColorDark: "#0b0b0d",
    backgroundColor: "#0b0b0d",
    navigationColor: "#0b0b0d",
    navigationColorDark: "#0b0b0d",
    navigationDividerColor: "#0b0b0d",
    navigationDividerColorDark: "#0b0b0d",
    display: "standalone",
    orientation: "default",
    fallbackType: "customtabs",
    enableNotifications: true,
    enableSiteSettingsShortcut: true,
    isChromeOSOnly: false,
    isMetaQuestOnly: false,
    minSdkVersion: 21,
    splashScreenFadeOutDuration: 300,
    signingMode: "new",
    signing: {
      file: null,
      alias: "spoiled",
      fullName: k.name.slice(0, 50),
      organization: "Spoiled Store",
      organizationalUnit: "Apps",
      countryCode: "US",
      keyPassword: pass,
      storePassword: pass,
    },
    generatorApp: "SpoiledStore",
    shortcuts: [],
    features: {},
    additionalTrustedOrigins: [],
    retainedBundleIds: [],
  };
  const res = await fetch(BUILDER, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = (await res.text()).replace(/<[^>]+>/g, " ").slice(0, 200);
    throw new Error("Android build failed: " + txt.trim());
  }
  const files = unzipSync(new Uint8Array(await res.arrayBuffer()));
  const apkName = Object.keys(files).find((f) => f.toLowerCase().endsWith(".apk"));
  const apk = apkName ? files[apkName] : undefined;
  if (!apk) throw new Error("Android build returned no .apk");
  return {
    apk,
    keystore: files["signing.keystore"] ?? null,
    assetlinks: files["assetlinks.json"] ?? null,
  };
}
