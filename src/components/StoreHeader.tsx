import { Link, useNavigate } from "@tanstack/react-router";
import { Code2, LogOut, Shield } from "lucide-react";
import logo from "@/assets/spoiled.png.asset.json";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

const navLink = "rounded-full px-3 py-1.5 font-medium text-muted-foreground hover:bg-glass-strong hover:text-foreground";

export function StoreHeader() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 px-4 pt-4">
      <div className="glass mx-auto flex max-w-6xl items-center gap-2 rounded-full px-3 py-2">
        <Link to="/" className="flex items-center gap-2.5 pl-1">
          <img src={logo.url} alt="Spoiled Store" className="h-8 w-8 rounded-full object-cover" />
          <span className="hidden font-display text-lg font-semibold tracking-tight sm:inline">Spoiled Store</span>
        </Link>

        <nav className="ml-2 flex items-center gap-1 text-sm">
          <Link to="/apps" className={navLink} activeProps={{ className: "rounded-full bg-glass-strong px-3 py-1.5 font-medium text-foreground" }}>Apps</Link>
          <Link to="/news" className={navLink} activeProps={{ className: "rounded-full bg-glass-strong px-3 py-1.5 font-medium text-foreground" }}>News</Link>
        </nav>

        <div className="ml-auto flex items-center gap-2 text-sm">
          <Link
            to="/developer"
            title="Developer options"
            aria-label="Developer options"
            className="grid h-9 w-9 place-items-center rounded-full bg-glass-strong hover:bg-accent"
            activeProps={{ className: "grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground" }}
          >
            <Code2 className="h-4 w-4" />
          </Link>
          {isAdmin && (
            <Link to="/admin" className="flex items-center gap-1.5 rounded-full bg-glass-strong px-3 py-1.5 font-medium hover:bg-accent">
              <Shield className="h-4 w-4" /> <span className="hidden sm:inline">Admin</span>
            </Link>
          )}
          {user ? (
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/", replace: true });
              }}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
            </button>
          ) : (
            <Link to="/auth" className="rounded-full bg-primary px-4 py-1.5 font-medium text-primary-foreground">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
