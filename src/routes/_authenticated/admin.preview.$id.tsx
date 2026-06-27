import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { adminGetServerDetail, adminSetServerStatus } from "@/lib/servers.functions";
import { getTrustBadge, badgeClasses } from "@/lib/trust";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/preview/$id")({
  head: () => ({ meta: [{ title: "Preview Submission — L2Index Admin" }] }),
  component: AdminPreview,
});

function AdminPreview() {
  const { id } = Route.useParams();
  const fetch = useServerFn(adminGetServerDetail);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-server-preview", id],
    queryFn: async () => {
      const r = await fetch({ data: { id } });
      if (!r) throw notFound();
      return r;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-5xl mx-auto p-12 text-muted-foreground">Loading preview…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-5xl mx-auto p-12">
          <p className="text-destructive text-sm">{(error as Error)?.message ?? "Not found"}</p>
          <Link to="/admin" className="text-brand text-sm">← Back to admin</Link>
        </div>
      </div>
    );
  }

  const { server, nameHistory, domainHistory, yearly, stats, currentSeasonVotes } = data;
  const trust = getTrustBadge(server.first_seen_at);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Admin preview banner */}
      <div className="bg-accent/10 border-b border-accent/30">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-3 flex-wrap text-sm">
          <div className="text-accent font-semibold">
            👁️ Admin Preview · Status:{" "}
            <span className="font-mono uppercase">{server.status}</span>
          </div>
          <Link to="/admin" className="text-brand hover:underline">← Back to admin</Link>
        </div>
      </div>

      {server.banner_url && (
        <div className="w-full h-48 md:h-64 overflow-hidden border-b border-border">
          <img src={server.banner_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <main className="max-w-6xl mx-auto px-6 py-12 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-start gap-5">
            <div className="size-20 rounded-xl bg-surface border border-border overflow-hidden grid place-items-center shrink-0">
              {server.logo_url ? (
                <img src={server.logo_url} alt={server.current_name} className="size-full object-cover" />
              ) : (
                <span className="font-mono text-muted-foreground">{server.current_name.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">{server.current_name}</h1>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${badgeClasses(trust.badge)}`}>{trust.label}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2 flex-wrap">
                <span className="font-mono bg-surface px-2 py-0.5 rounded">{server.chronicle}</span>
                <span className="font-mono bg-surface px-2 py-0.5 rounded">x{String(server.rates).replace(/^x/i, "")}</span>
                {server.country && <span>· {server.country}</span>}
                {server.server_type && <span>· {server.server_type}</span>}
              </div>
              <div className="flex gap-3 mt-3 text-sm">
                <a href={server.website_url} target="_blank" rel="noreferrer" className="text-brand hover:underline">{server.domain}</a>
                {server.discord_url && <a href={server.discord_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-white">Discord</a>}
              </div>
            </div>
            <button disabled className="bg-brand/40 text-brand-foreground px-6 py-3 rounded-lg font-bold cursor-not-allowed" title="Voting disabled in preview">
              VOTE
            </button>
          </div>

          <section>
            <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-3">About</h2>
            <p className="text-foreground whitespace-pre-wrap leading-relaxed text-sm">{server.description}</p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-3">Ranking History</h2>
            <div className="bg-surface border border-border rounded-xl p-4 h-72">
              {stats.length === 0 ? (
                <div className="h-full grid place-items-center text-muted-foreground text-sm">No data yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats}>
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip contentStyle={{ background: "#0f1115", border: "1px solid #1f2937", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="votes" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Submission Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd className="text-white font-mono uppercase">{server.status}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Submitted</dt><dd className="text-white">{new Date(server.created_at).toLocaleDateString()}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">First seen</dt><dd className="text-white">{new Date(server.first_seen_at).toLocaleDateString()}</dd></div>
              {server.launch_date && <div className="flex justify-between"><dt className="text-muted-foreground">Launch</dt><dd className="text-white">{new Date(server.launch_date).toLocaleDateString()}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted-foreground">Years listed</dt><dd className="text-white">{trust.years}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Season votes</dt><dd className="text-white font-mono">{currentSeasonVotes.toLocaleString()}</dd></div>
            </dl>
          </div>

          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Name History</h3>
            {nameHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No name changes recorded.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {nameHistory.map((n) => (
                  <li key={n.id} className="text-foreground">
                    <span className="line-through text-muted-foreground">{n.old_name}</span> → <span className="text-white">{n.new_name}</span>
                    <div className="text-[10px] text-muted-foreground">{new Date(n.changed_at).toLocaleDateString()}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Domain History</h3>
            {domainHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No domain changes recorded.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {domainHistory.map((d) => (
                  <li key={d.id} className="text-foreground">
                    <span className="line-through text-muted-foreground">{d.old_domain}</span> → <span className="text-white">{d.new_domain}</span>
                    <div className="text-[10px] text-muted-foreground">{new Date(d.changed_at).toLocaleDateString()}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Yearly Ranks</h3>
            {yearly.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No closed seasons yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {yearly.map((y) => (
                  <li key={y.id} className="flex justify-between">
                    <span className="font-mono text-muted-foreground">{y.year}</span>
                    <span className="text-white">#{y.rank} <span className="text-muted-foreground text-xs">({y.total_votes.toLocaleString()} votes)</span></span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </main>
      <Footer />
    </div>
  );
}
