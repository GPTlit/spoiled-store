import type { Database } from "@/integrations/supabase/types";

export type AppRow = Database["public"]["Tables"]["apps"]["Row"];
export type FeedbackRow = Database["public"]["Tables"]["feedback"]["Row"];

export const OWNER_EMAIL = "salemmoustapha15@gmail.com";

/** Stable URL for a stored file (redirects to a fresh signed link). */
export function fileUrl(path: string | null | undefined, download?: string) {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  const q = new URLSearchParams({ path });
  if (download) q.set("dl", download);
  return `/api/public/file?${q.toString()}`;
}

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "app"
  ) + "-" + Math.random().toString(36).slice(2, 6);
}

export type Platform = "android" | "ios" | "desktop";
export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && "ontouchend" in document)) return "ios";
  return "desktop";
}

export const STATUS_LABEL: Record<string, string> = {
  ready: "Ready",
  importing: "Importing",
  building: "Building Android app…",
  kit_ready: "Build kit ready",
  failed: "Failed",
};

/** Branded download filename, e.g. "my-app-spoiled.apk". */
export function downloadName(name: string, ext: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "app";
  return `${base}-spoiled.${ext}`;
}
