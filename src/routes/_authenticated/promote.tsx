import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import {
  getAdvertisingDashboard,
  createTokenPromotion,
  PROMOTION_TYPES,
  type PromotionType,
} from "@/lib/advertising.functions";

export const Route = createFileRoute("/_authenticated/promote")({
  head: () => ({
    meta: [
      { title: "Advertising Dashboard — L2Index" },
      { name: "description", content: "Promote your Lineage 2 server on L2Index using tokens." },
    ],
  }),
  component: PromotePage,
});

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString();
}

function PromotePage() {
  const fetchDashboard = useServerFn(getAdvertisingDashboard);
  const createPromo = useServerFn(createTokenPromotion);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["advertising-dashboard"],
    queryFn: () => fetchDashboard(),
  });

  const [showModal, setShowModal] = useState(false);
  const [serverId, setServerId] = useState("");
  const [promoType, setPromoType] = useState<PromotionType>("banner");
  const [days, setDays] = useState(7);
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: (input: { server_id: string; type: PromotionType; days: number }) =>
      createPromo({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["advertising-dashboard"] });
      setShowModal(false);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main className="max-w-5xl mx-auto px-6 py-16 text-center text-muted-foreground text-sm">Loading…</main>
        <Footer />
      </div>
    );
  }

  const d = data!;

  if (!d.hasApproved) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main className="max-w-2xl mx-auto px-6 py-20 text-center">
          <h1 className="text-3xl font-extrabold text-white mb-3">Advertising Dashboard</h1>
          <div className="bg-surface border border-border rounded-xl p-8">
            <p className="text-white font-semibold mb-2">You need at least one approved server</p>
            <p className="text-muted-foreground text-sm mb-6">
              The advertising dashboard is available for server owners with an approved listing.
              Submit your server for moderation to unlock promotions.
            </p>
            <Link
              to="/add-server"
              className="inline-block bg-brand text-brand-foreground px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition"
            >
              Add Your Server
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const selectedPrice = PROMOTION_TYPES.find((p) => p.value === promoType)!;
  const totalCost = selectedPrice.costPerDay * days;
  const canAfford = d.balance >= totalCost;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Advertising Dashboard</h1>
            <p className="text-sm text-muted-foreground">Promote your servers using tokens.</p>
          </div>
          <button
            disabled
            title="Payments coming soon"
            className="bg-surface border border-border text-muted-foreground px-4 py-2 rounded-lg text-sm font-semibold cursor-not-allowed opacity-60"
          >
            Buy Tokens (coming soon)
          </button>
        </div>

        {/* Balance */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-surface border border-brand/30 rounded-xl p-5">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Token Balance</div>
            <div className="text-3xl font-black text-brand">{d.balance.toLocaleString()}</div>
            <div className="text-[11px] text-muted-foreground mt-1">Available for promotions</div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Approved Servers</div>
            <div className="text-3xl font-black text-white">{d.approvedServers.length}</div>
            <div className="text-[11px] text-muted-foreground mt-1">Eligible to promote</div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Promote</div>
              <div className="text-xs text-muted-foreground">Spend tokens to feature a server.</div>
            </div>
            <button
              onClick={() => {
                setServerId(d.approvedServers[0]?.id ?? "");
                setShowModal(true);
              }}
              className="mt-3 bg-brand text-brand-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition"
            >
              Promote Server
            </button>
          </div>
        </div>

        {/* My Servers */}
        <section>
          <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-2">My Servers</h2>
          <div className="border border-border rounded-lg overflow-hidden bg-surface/30 divide-y divide-border">
            {d.servers.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-3 py-2">
                <div className="size-8 rounded bg-background border border-border overflow-hidden grid place-items-center shrink-0">
                  {s.logo_url
                    ? <img src={s.logo_url} alt="" className="size-full object-cover" />
                    : <span className="text-[9px] font-mono text-muted-foreground">{s.current_name.slice(0,2).toUpperCase()}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-semibold truncate">{s.current_name}</div>
                  <div className="text-[10px] text-muted-foreground">{s.chronicle} · x{String(s.rates).replace(/^x/i, "")}</div>
                </div>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                  s.status === "approved" ? "border-success/30 text-success bg-success/10" :
                  s.status === "pending"  ? "border-accent/30 text-accent bg-accent/10" :
                  "border-border text-muted-foreground bg-white/5"
                }`}>{s.status}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Promotion History */}
        <section>
          <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-2">Promotion History</h2>
          {d.promotions.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-border rounded-lg text-xs text-muted-foreground">No promotions yet.</div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden bg-surface/30">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/60">
                  <tr>
                    <th className="text-left px-3 py-2">Server</th>
                    <th className="text-left px-3 py-2">Type</th>
                    <th className="text-left px-3 py-2">Period</th>
                    <th className="text-right px-3 py-2">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {d.promotions.map((p) => (
                    <tr key={p.id}>
                      <td className="px-3 py-2 text-white">{p.server_name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.type}</td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">{fmtDate(p.start_date)} → {fmtDate(p.end_date)}</td>
                      <td className="px-3 py-2 text-right font-mono text-brand">-{p.token_cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Token History */}
        <section>
          <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-2">Token History</h2>
          {d.transactions.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-border rounded-lg text-xs text-muted-foreground">No token activity yet.</div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden bg-surface/30">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/60">
                  <tr>
                    <th className="text-left px-3 py-2">Date</th>
                    <th className="text-left px-3 py-2">Type</th>
                    <th className="text-left px-3 py-2">Description</th>
                    <th className="text-right px-3 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {d.transactions.map((t) => (
                    <tr key={t.id}>
                      <td className="px-3 py-2 text-muted-foreground text-xs">{fmtDate(t.created_at)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{t.type}</td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">{t.description ?? ""}</td>
                      <td className={`px-3 py-2 text-right font-mono ${t.amount < 0 ? "text-accent" : "text-success"}`}>
                        {t.amount > 0 ? "+" : ""}{t.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center px-4" onClick={() => setShowModal(false)}>
          <div className="bg-surface border border-border rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Promote a Server</h3>
            <div className="space-y-3">
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Server</span>
                <select
                  value={serverId}
                  onChange={(e) => setServerId(e.target.value)}
                  className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm"
                >
                  {d.approvedServers.map((s) => (
                    <option key={s.id} value={s.id}>{s.current_name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Promotion Type</span>
                <select
                  value={promoType}
                  onChange={(e) => setPromoType(e.target.value as PromotionType)}
                  className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm"
                >
                  {PROMOTION_TYPES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label} — {p.costPerDay} tokens/day</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Duration (days)</span>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={days}
                  onChange={(e) => setDays(Math.max(1, Math.min(90, Number(e.target.value) || 1)))}
                  className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm"
                />
              </label>

              <div className="bg-background/60 border border-border rounded-lg p-3 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Total cost</span>
                <span className="text-lg font-black text-brand">{totalCost} tokens</span>
              </div>
              {!canAfford && (
                <p className="text-[11px] text-accent">Insufficient tokens. You have {d.balance}.</p>
              )}
              {error && <p className="text-[11px] text-accent">{error}</p>}
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-white"
              >Cancel</button>
              <button
                disabled={!canAfford || !serverId || mut.isPending}
                onClick={() => mut.mutate({ server_id: serverId, type: promoType, days })}
                className="bg-brand text-brand-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mut.isPending ? "Promoting…" : "Confirm & Spend Tokens"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
