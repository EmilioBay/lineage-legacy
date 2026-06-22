import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — L2Index" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase recovery link sets a session via URL hash on load.
    supabase.auth.getSession().then(({ data }) => {
      setReady(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You're signed in.");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background grid place-items-center p-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="block text-center mb-8">
          <span className="text-2xl font-extrabold tracking-tighter text-white">
            <span className="inline-flex size-8 bg-brand rounded items-center justify-center text-sm mr-2 align-middle text-brand-foreground">L2</span>INDEX
          </span>
        </Link>
        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <h1 className="text-xl font-bold text-white">Set a new password</h1>
          {!ready ? (
            <p className="text-sm text-muted-foreground">
              Open the reset link from your email to continue. If you arrived here directly, request a new link from the{" "}
              <Link to="/auth" className="text-brand hover:underline">sign-in page</Link>.
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password (min 8 chars)"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand"
              />
              <button disabled={loading} className="w-full bg-brand text-brand-foreground rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50">
                {loading ? "..." : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
