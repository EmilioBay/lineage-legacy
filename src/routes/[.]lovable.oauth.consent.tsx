import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Beta namespace typing shim.
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{
    data: { client?: { name?: string }; redirect_url?: string; redirect_to?: string; scope?: string } | null;
    error: { message: string } | null;
  }>;
  approveAuthorization: (id: string) => Promise<{
    data: { redirect_url?: string; redirect_to?: string } | null;
    error: { message: string } | null;
  }>;
  denyAuthorization: (id: string) => Promise<{
    data: { redirect_url?: string; redirect_to?: string } | null;
    error: { message: string } | null;
  }>;
};
function oauthApi(): OAuthApi {
  return (supabase.auth as unknown as { oauth: OAuthApi }).oauth;
}

function isSameOriginRelative(next: string): boolean {
  return next.startsWith("/") && !next.startsWith("//");
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + (location.searchStr ?? "");
    if (!data.session) {
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthApi().getAuthorizationDetails(id);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen grid place-items-center bg-background p-6">
      <div className="max-w-md text-center text-foreground">
        <h1 className="text-xl font-semibold text-white">Authorization unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {(error as Error)?.message ?? String(error)}
        </p>
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauthApi().approveAuthorization(authorization_id)
      : await oauthApi().denyAuthorization(authorization_id);
    if (error) { setBusy(false); setError(error.message); return; }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); setError("No redirect returned by the authorization server."); return; }
    if (isSameOriginRelative(target)) window.location.assign(target);
    else window.location.href = target;
  }

  const clientName = details?.client?.name ?? "an app";
  return (
    <main className="min-h-screen grid place-items-center bg-background p-6">
      <div className="w-full max-w-md bg-surface border border-border rounded-xl p-6 space-y-4">
        <h1 className="text-xl font-bold text-white">Connect {clientName} to L2Index</h1>
        <p className="text-sm text-muted-foreground">
          This lets <span className="text-foreground font-medium">{clientName}</span> use L2Index tools while acting as you.
          Your existing app permissions and backend policies still control what data it can reach.
        </p>
        {details?.scope && (
          <p className="text-xs text-muted-foreground">
            Requested scope: <code className="text-foreground">{details.scope}</code>
          </p>
        )}
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 bg-brand text-brand-foreground rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {busy ? "…" : "Approve"}
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 bg-background border border-border rounded-lg py-2.5 text-sm font-medium text-foreground disabled:opacity-50"
          >
            Deny
          </button>
        </div>
      </div>
    </main>
  );
}
