import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import {
  getAdvertisingDashboard,
  createTokenPromotion,
  renewPromotion,
  createSpotlightPromotion,
  renewSpotlightPromotion,
  type PromotionType,
} from "@/lib/advertising.functions";


const BANNER_TYPES: PromotionType[] = ["banner", "banner_left", "banner_right"];
const HOMEPAGE_TYPES: PromotionType[] = ["sponsored", "sponsored_new"];


const SLOT_META: Record<PromotionType, { size: string; hint: string }> = {
  banner:        { size: "1200 × 120 px", hint: "Homepage top strip banner." },
  banner_left:   { size: "300 × 600 px",  hint: "Left side rail (desktop ≥1280px)." },
  banner_right:  { size: "300 × 600 px",  hint: "Right side rail (desktop ≥1280px)." },
  spotlight:     { size: "128 × 128 logo",hint: "Featured row inside Current Season." },
  sponsored:     { size: "128 × 128 logo",hint: "Sponsored card in homepage rankings." },
  sponsored_new: { size: "128 × 128 logo",hint: "Sponsored card in New Servers table." },
};

export const Route = createFileRoute("/_authenticated/promote")({
  head: () => ({
    meta: [
      { title: "Advertising — L2Index" },
      { name: "description", content: "Promote your Lineage 2 server on L2Index using Index Credits." },
    ],
  }),
  component: PromotePage,
});

function fmtDate(iso: string) { return new Date(iso).toLocaleDateString(); }
function fmtDateTime(iso: string) { return new Date(iso).toLocaleString(); }
function daysUntil(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

function PromotePage() {
  const fetchDashboard = useServerFn(getAdvertisingDashboard);
  const createPromo = useServerFn(createTokenPromotion);
  const renewPromo = useServerFn(renewPromotion);
  const createSpot = useServerFn(createSpotlightPromotion);
  const renewSpot = useServerFn(renewSpotlightPromotion);

  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["advertising-dashboard"],
    queryFn: () => fetchDashboard(),
  });

  const [category, setCategory] = useState<"banner" | "spotlight" | "homepage">("banner");
  const [promoModal, setPromoModal] = useState<{ type: PromotionType; name: string; costPerDay: number } | null>(null);
  const [renewModal, setRenewModal] = useState<{ id: string; server_name: string; type: string; costPerDay: number } | null>(null);
  const [spotlightModal, setSpotlightModal] = useState<{ position: number; tier: "premium" | "standard"; costPerDay: number } | null>(null);
  const [spotlightRenew, setSpotlightRenew] = useState<{ id: string; position: number; server_name: string; costPerDay: number } | null>(null);
  const [serverId, setServerId] = useState("");
  const [days, setDays] = useState(7);
  const [renewDays, setRenewDays] = useState(7);


  const createMut = useMutation({
    mutationFn: (input: { server_id: string; type: PromotionType; days: number }) => createPromo({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["advertising-dashboard"] });
      toast.success("Promotion activated");
      setPromoModal(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renewMut = useMutation({
    mutationFn: (input: { promotion_id: string; days: number }) => renewPromo({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["advertising-dashboard"] });
      toast.success("Promotion renewed");
      setRenewModal(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createSpotMut = useMutation({
    mutationFn: (input: { server_id: string; position: number; days: number }) => createSpot({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["advertising-dashboard"] });
      toast.success("Spotlight position secured");
      setSpotlightModal(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renewSpotMut = useMutation({
    mutationFn: (input: { promotion_id: string; days: number }) => renewSpot({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["advertising-dashboard"] });
      toast.success("Spotlight extended");
      setSpotlightRenew(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const active = useMemo(() => (data?.promotions ?? []).filter((p) => p.is_active), [data]);
  const pending = useMemo(() => (data?.promotions ?? []).filter((p) => p.is_pending), [data]);
  const history = useMemo(() => (data?.promotions ?? []).filter((p) => !p.is_active && !p.is_pending), [data]);

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
          <h1 className="text-3xl font-extrabold text-white mb-3">Advertising</h1>
          <div className="bg-surface border border-border rounded-xl p-8">
            <p className="text-white font-semibold mb-2">You need at least one approved server</p>
            <p className="text-muted-foreground text-sm mb-6">Advertising is available to server owners with an approved listing.</p>
            <Link to="/add-server" className="inline-block bg-brand text-brand-foreground px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition">
              Add Your Server
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Advertising</h1>
            <p className="text-xs text-muted-foreground">Promote your servers using Index Credits.</p>
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-surface border border-brand/30 rounded-lg p-3">
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Index Credits</div>
            <div className="text-2xl font-black text-brand mt-0.5">{d.balance.toLocaleString()}</div>
            <Link to="/credits" className="mt-1.5 inline-block text-[11px] font-semibold text-brand hover:underline">+ Buy Credits</Link>
          </div>
          <StatBox label="Eligible Servers" value={d.approvedServers.length} />
          <StatBox label="Active Promotions" value={active.length} />
          <StatBox label="Pending" value={pending.length} />
        </div>

        {/* Promotion slots by category */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            {([["banner", "Banner Advertising"], ["spotlight", "Spotlight Row"], ["homepage", "Homepage Promotion"]] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setCategory(id)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-md border transition ${
                  category === id
                    ? "bg-brand/15 border-brand/40 text-brand"
                    : "bg-surface border-border text-muted-foreground hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {d.pricing
              .filter((p) => (category === "banner" ? BANNER_TYPES : HOMEPAGE_TYPES).includes(p.type))
              .map((p) => {
                const slot = d.slotState[p.type] as
                  | { occupied: boolean; next_available: string | null; occupant_name?: string | null; owned_by_me?: boolean; my_promotion_id?: string | null }
                  | undefined;
                const occupied = p.exclusive && slot?.occupied;
                const mine = occupied && slot?.owned_by_me;
                const meta = SLOT_META[p.type];
                return (
                  <div key={p.type} className={`relative bg-surface border rounded-lg p-4 flex flex-col ${occupied ? (mine ? "border-brand/40" : "border-border/60") : "border-border hover:border-brand/40 transition-colors"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-white">{p.name}</h3>
                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                        mine ? "border-brand/40 text-brand bg-brand/10"
                          : occupied ? "border-accent/40 text-accent bg-accent/10"
                          : "border-success/40 text-success bg-success/10"
                      }`}>{mine ? "Yours" : occupied ? "Occupied" : "Available"}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">{p.description || meta.hint}</p>
                    <div className="mt-2 text-[10px] font-mono text-muted-foreground">
                      Size: <span className="text-white">{meta.size}</span>
                    </div>
                    {occupied && slot?.occupant_name && (
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        Held by: <span className="text-white">{slot.occupant_name}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
                      <div className="text-[10px] text-muted-foreground">Cost</div>
                      <div className="text-sm font-mono text-brand font-bold">{p.cost_per_day} / day</div>
                    </div>
                    {occupied && slot?.next_available && (
                      <div className="mt-2 text-[10px] text-muted-foreground">
                        {mine ? "Expires" : "Next available"}: <span className="text-white font-mono">{fmtDate(slot.next_available)}</span>
                        {" · "}<span className="text-white/70">{daysUntil(slot.next_available)}d</span>
                      </div>
                    )}
                    {mine && slot?.my_promotion_id ? (
                      <button
                        onClick={() => setRenewModal({ id: slot.my_promotion_id!, server_name: slot.occupant_name ?? "", type: p.name, costPerDay: p.cost_per_day })}
                        className="mt-2 w-full bg-brand/15 border border-brand/30 text-brand text-xs font-semibold py-1.5 rounded hover:bg-brand/25 transition"
                      >
                        Extend
                      </button>
                    ) : !occupied ? (
                      <button
                        onClick={() => { setPromoModal({ type: p.type as PromotionType, name: p.name, costPerDay: p.cost_per_day }); setServerId(d.approvedServers[0]?.id ?? ""); setDays(7); }}
                        className="mt-2 w-full bg-brand text-brand-foreground text-xs font-semibold py-1.5 rounded hover:opacity-90 transition"
                      >
                        Promote
                      </button>
                    ) : null}
                  </div>
                );
              })}
          </div>
        </section>

        {/* Current promotions */}
        <section>
          <h2 className="text-xs font-bold text-white uppercase tracking-widest mb-2">Current Promotions</h2>
          {active.length === 0 ? (
            <div className="text-center py-5 border border-dashed border-border rounded-lg text-xs text-muted-foreground">No active promotions.</div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden bg-surface/30">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/60">
                  <tr>
                    <th className="text-left px-3 py-2">Server</th>
                    <th className="text-left px-3 py-2">Slot</th>
                    <th className="text-left px-3 py-2">Expires</th>
                    <th className="text-right px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {active.map((p) => {
                    const price = d.pricing.find((x) => x.type === p.type);
                    return (
                      <tr key={p.id}>
                        <td className="px-3 py-2 text-white">{p.server_name}</td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">{price?.name ?? p.type}</td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">{fmtDate(p.end_date)} <span className="text-white/50">({daysUntil(p.end_date)}d left)</span></td>
                        <td className="px-3 py-2 text-right">
                          {price && (
                            <button
                              onClick={() => setRenewModal({ id: p.id, server_name: p.server_name, type: price.name, costPerDay: price.cost_per_day })}
                              className="text-[11px] font-semibold bg-brand/15 text-brand border border-brand/30 px-2 py-1 rounded hover:bg-brand/25 transition"
                            >Renew</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Pending */}
        {pending.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-white uppercase tracking-widest mb-2">Pending Promotions</h2>
            <div className="border border-border rounded-lg overflow-hidden bg-surface/30">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/60">
                  <tr>
                    <th className="text-left px-3 py-2">Server</th>
                    <th className="text-left px-3 py-2">Slot</th>
                    <th className="text-left px-3 py-2">Requested</th>
                    <th className="text-right px-3 py-2">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pending.map((p) => (
                    <tr key={p.id}>
                      <td className="px-3 py-2 text-white">{p.server_name}</td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">{p.type}</td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">{fmtDate(p.created_at)}</td>
                      <td className="px-3 py-2 text-right font-mono text-accent">{p.token_cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* History */}
        {history.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-white uppercase tracking-widest mb-2">Promotion History</h2>
            <div className="border border-border rounded-lg overflow-hidden bg-surface/30">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/60">
                  <tr>
                    <th className="text-left px-3 py-2">Server</th>
                    <th className="text-left px-3 py-2">Slot</th>
                    <th className="text-left px-3 py-2">Period</th>
                    <th className="text-right px-3 py-2">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.map((p) => (
                    <tr key={p.id}>
                      <td className="px-3 py-2 text-white">{p.server_name}</td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">{p.type}</td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">{fmtDate(p.start_date)} → {fmtDate(p.end_date)}</td>
                      <td className="px-3 py-2 text-right font-mono text-brand">-{p.token_cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Credit History */}
        <section>
          <h2 className="text-xs font-bold text-white uppercase tracking-widest mb-2">Index Credit Activity</h2>
          {d.transactions.length === 0 ? (
            <div className="text-center py-5 border border-dashed border-border rounded-lg text-xs text-muted-foreground">No activity yet.</div>
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
                      <td className="px-3 py-2 text-muted-foreground text-xs">{fmtDateTime(t.created_at)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{t.type}</td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">{t.description ?? ""}</td>
                      <td className={`px-3 py-2 text-right font-mono ${t.amount < 0 ? "text-accent" : "text-success"}`}>{t.amount > 0 ? "+" : ""}{t.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Promote modal */}
      {promoModal && (
        <Modal onClose={() => setPromoModal(null)} title={`Promote — ${promoModal.name}`}>
          <ModalBody>
            <Field label="Server">
              <select value={serverId} onChange={(e) => setServerId(e.target.value)} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm">
                {d.approvedServers.map((s) => <option key={s.id} value={s.id}>{s.current_name}</option>)}
              </select>
            </Field>
            <Field label="Duration (days)">
              <input type="number" min={1} max={90} value={days}
                onChange={(e) => setDays(Math.max(1, Math.min(90, Number(e.target.value) || 1)))}
                className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm" />
            </Field>
            <TotalRow total={promoModal.costPerDay * days} balance={d.balance} />
          </ModalBody>
          <ModalFooter>
            <button onClick={() => setPromoModal(null)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-white">Cancel</button>
            <button
              disabled={createMut.isPending || d.balance < promoModal.costPerDay * days || !serverId}
              onClick={() => createMut.mutate({ server_id: serverId, type: promoModal.type, days })}
              className="bg-brand text-brand-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >{createMut.isPending ? "Working…" : "Confirm & Spend Credits"}</button>
          </ModalFooter>
        </Modal>
      )}

      {/* Renew modal */}
      {renewModal && (
        <Modal onClose={() => setRenewModal(null)} title={`Renew — ${renewModal.type}`}>
          <ModalBody>
            <p className="text-xs text-muted-foreground">Server: <span className="text-white">{renewModal.server_name}</span></p>
            <Field label="Extend by (days)">
              <input type="number" min={1} max={90} value={renewDays}
                onChange={(e) => setRenewDays(Math.max(1, Math.min(90, Number(e.target.value) || 1)))}
                className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm" />
            </Field>
            <TotalRow total={renewModal.costPerDay * renewDays} balance={d.balance} />
          </ModalBody>
          <ModalFooter>
            <button onClick={() => setRenewModal(null)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-white">Cancel</button>
            <button
              disabled={renewMut.isPending || d.balance < renewModal.costPerDay * renewDays}
              onClick={() => renewMut.mutate({ promotion_id: renewModal.id, days: renewDays })}
              className="bg-brand text-brand-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >{renewMut.isPending ? "Renewing…" : "Confirm Renewal"}</button>
          </ModalFooter>
        </Modal>
      )}


      <Footer />
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-3">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">{label}</div>
      <div className="text-2xl font-black text-white mt-0.5">{value}</div>
    </div>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center px-4" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-base font-bold text-white">{title}</h3>
        </div>
        {children}
      </div>
    </div>
  );
}
function ModalBody({ children }: { children: React.ReactNode }) {
  return <div className="p-5 space-y-3">{children}</div>;
}
function ModalFooter({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-3 border-t border-border flex justify-end gap-2">{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{label}</span>
      {children}
    </label>
  );
}
function TotalRow({ total, balance }: { total: number; balance: number }) {
  const enough = balance >= total;
  return (
    <div className="bg-background/60 border border-border rounded-lg p-3 space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">Total</span>
        <span className="text-lg font-black text-brand">{total} credits</span>
      </div>
      {!enough && <p className="text-[11px] text-accent">Insufficient credits. You have {balance}.</p>}
    </div>
  );
}
