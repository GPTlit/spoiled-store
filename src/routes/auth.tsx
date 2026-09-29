import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import logo from "@/assets/spoiled.png.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Spoiled Store" },
      { name: "description", content: "Sign in to Spoiled Store to leave feedback on apps." },
      { property: "og:title", content: "Sign in — Spoiled Store" },
      { property: "og:description", content: "Sign in to leave feedback on apps." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({ email: z.string().trim().email().max(255), password: z.string().min(6).max(72) });

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) { toast.error("Enter a valid email and a password of 6+ characters"); return; }
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword(parsed.data);
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      navigate({ to: "/" });
    } else {
      const { error } = await supabase.auth.signUp({ ...parsed.data, options: { emailRedirectTo: window.location.origin } });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Check your email to confirm your account");
    }
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) { toast.error("Google sign-in failed"); return; }
    if (r.redirected) return;
    navigate({ to: "/" });
  };

  return (
    <div className="relative grid min-h-screen place-items-center px-4">
      <div className="fixed inset-0 -z-10 bg-cover bg-center opacity-25 grayscale" style={{ backgroundImage: `url(${logo.url})` }} />
      <div className="fixed inset-0 -z-10 bg-background/70" />
      <div className="w-full max-w-sm rounded-[2rem] glass-strong p-8">
        <img src={logo.url} alt="Spoiled" className="mx-auto h-16 w-16 rounded-2xl object-cover" />
        <h1 className="mt-4 text-center text-2xl font-semibold">{mode === "in" ? "Welcome back" : "Create account"}</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">Sign in to leave feedback on apps</p>
        <button onClick={google} className="mt-6 w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground">
          Continue with Google
        </button>
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />or<div className="h-px flex-1 bg-border" /></div>
        <form onSubmit={submit} className="space-y-3">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" className="w-full rounded-2xl border border-input bg-glass px-4 py-2.5 text-sm outline-none focus:border-ring" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" className="w-full rounded-2xl border border-input bg-glass px-4 py-2.5 text-sm outline-none focus:border-ring" />
          <button disabled={busy} className="w-full rounded-full bg-glass-strong py-2.5 text-sm font-semibold hover:bg-accent disabled:opacity-50">
            {mode === "in" ? "Sign in" : "Sign up"}
          </button>
        </form>
        <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground">
          {mode === "in" ? "No account? Sign up" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
