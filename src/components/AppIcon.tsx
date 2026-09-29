import { fileUrl, type AppRow } from "@/lib/store";

export function AppIcon({ app, size = "md" }: { app: Pick<AppRow, "icon_url" | "name">; size?: "md" | "lg" | "xl" }) {
  const cls = size === "xl" ? "h-28 w-28 rounded-[1.75rem]" : size === "lg" ? "h-20 w-20 rounded-[1.4rem]" : "h-14 w-14 rounded-2xl";
  return app.icon_url ? (
    <img src={fileUrl(app.icon_url)} alt={app.name} className={`${cls} shrink-0 border border-glass-edge object-cover`} />
  ) : (
    <div className={`${cls} grid shrink-0 place-items-center border border-glass-edge bg-glass-strong font-display text-xl font-semibold`}>
      {app.name.charAt(0)}
    </div>
  );
}
