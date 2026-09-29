import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Shield } from "lucide-react";
import logo from "@/assets/spoiled.png.asset.json";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export function StoreHeader() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 px-4 pt-4">
      <div className="glass mx-auto flex max-w-6xl items-center justify-between rounded-full px-3 py-2">
        <Link to="/" className="flex items-center gap-2.5 pl-1">
          <img src={logo.url} alt="Spoiled Store" className="h-8 w-8 rounded-full object-cover" />
          <span className="font-display text-lg font-semibold tracking-tight">Spoiled Store</span>
        </Link>
        <div className="flex items-center gap-2 text-sm">
          {isAdmin && (
            <Link to="/admin" className="flex items-center gap-1.5 rounded-full bg-glass-strong px-3 py-1.5 font-medium hover:bg-accent">
              <Shield className="h-4 w-4" /> Admin
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
              <LogOut className="h-4 w-4" /> Sign out
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
