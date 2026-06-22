import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — L2Index" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"sign_in" | "sign_up" | "forgot">("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "sign_up") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created. Signing you in…");
        // With auto-confirm enabled, signUp returns a session — but be defensive.
        const { data: sess } = await supabase.auth.getSession();
        if (sess.session) navigate({ to: "/dashboard" });
        else setMode("sign_in");
      } else if (mode === "sign_in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("If that email is registered, a reset link is on its way.");
        setMode("sign_in");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) toast.error((result.error as Error).message);
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  const title = mode === "sign_in" ? "Sign in" : mode === "sign_up" ? "Create account" : "Reset password";

  return (
    <div className="min-h-screen bg-background grid place-items-center p-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="block text-center mb-8">
          <span className="text-2xl font-extrabold tracking-tighter text-white">
            <span className="inline-flex size-8 bg-brand rounded items-center justify-center text-sm mr-2 align-middle text-brand-foreground">L2</span>INDEX
          </span>
        </Link>

        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <h1 className="text-xl font-bold text-white">{title}</h1>

          {mode !== "forgot" && (
            <>
              <button onClick={google} className="w-full bg-white text-black rounded-lg py-2.5 text-sm font-semibold hover:opacity-90">
                Continue with Google
              </button>
              <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                <div className="h-px bg-border flex-1" /> or <div className="h-px bg-border flex-1" />
              </div>
            </>
          )}

          <form onSubmit={submit} className="space-y-3">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand" />
            {mode !== "forgot" && (
              <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 8 chars)" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand" />
            )}
            <button disabled={loading} className="w-full bg-brand text-brand-foreground rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50">
              {loading ? "..." : mode === "sign_in" ? "Sign in" : mode === "sign_up" ? "Create account" : "Send reset link"}
            </button>
          </form>

          {mode === "sign_in" && (
            <div className="text-right">
              <button onClick={() => setMode("forgot")} className="text-xs text-brand hover:underline">Forgot password?</button>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            {mode === "sign_in" && (
              <>No account? <button onClick={() => setMode("sign_up")} className="text-brand hover:underline">Sign up</button></>
            )}
            {mode === "sign_up" && (
              <>Already registered? <button onClick={() => setMode("sign_in")} className="text-brand hover:underline">Sign in</button></>
            )}
            {mode === "forgot" && (
              <>Remembered it? <button onClick={() => setMode("sign_in")} className="text-brand hover:underline">Back to sign in</button></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
